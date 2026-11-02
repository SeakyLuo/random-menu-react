"""Convert a verified Android RandomMenu backup to a streaming Aurai library ZIP.

Original backup files are read-only. --metadata-only validates media references and
writes just the small library.json, useful before allocating space for a full ZIP.
"""
import argparse
import json
import pathlib
import sqlite3
import zipfile
from datetime import datetime
from zoneinfo import ZoneInfo
from collections import defaultdict


def prepare(source, skip_missing_media=False, cover_replacements=None):
    external = source / 'external-files/RandomMenu'
    connection = sqlite3.connect(
        (source / 'private-data/databases/randomMenu.db').as_uri() + '?mode=ro', uri=True
    )
    connection.row_factory = sqlite3.Row
    # One independent bounded query per table. Relationships are grouped in memory.
    names = ['self_food', 'restaurant', 'restaurant_food', 'consume_record',
             'address', 'image_path', 'food_type', 'food_tag', 'self_food_tag',
             'auto_tag_map', 'eater', 'search_history']
    tables = {name: [dict(row) for row in connection.execute(f'SELECT * FROM {name}')]
              for name in names}
    connection.close()
    settings = json.loads((external / 'RandomMenuSettings.json').read_text())
    photos = sorted((external / 'RandomMenuFood').iterdir())
    photos += sorted((external / 'SavedImages').iterdir())
    by_name = {}
    for path in photos:
        if path.is_file():
            if path.name in by_name:
                raise ValueError(f'Duplicate photo filename: {path.name}')
            by_name[path.name] = path
    media = {}
    for index, (name, path) in enumerate(by_name.items()):
        suffix = path.suffix.lower()
        if suffix not in {'.jpg', '.jpeg', '.png', '.webp', '.gif'}:
            raise ValueError(f'Unsupported media: {path}')
        media[name] = {'path': f'media/{index:06d}{suffix}', 'bytes': path.stat().st_size}

    image_groups = defaultdict(list)
    for row in sorted(tables['image_path'], key=lambda row: row['orderNum']):
        image_groups[(row['itemType'], row['itemId'])].append(row['path'])

    missing = []

    def images(kind, key, cover=''):
        values = list(image_groups[(kind, key)])
        if cover_replacements and cover in cover_replacements:
            replacement = cover_replacements[cover]
            if replacement not in values:
                raise ValueError(f'Replacement is not a photo of this record: {replacement}')
            cover = replacement
        if cover:
            values = [cover] + [name for name in values if name != cover]
        result = []
        for name in values:
            if not name:
                continue
            if name not in media:
                if not skip_missing_media:
                    raise ValueError(f'Missing referenced image: {kind}/{key}: {name}')
                missing.append({'kind': kind, 'key': str(key), 'filename': name})
                continue
            result.append(media[name]['path'])
        return result

    tags = {row['id']: row['name'] for row in tables['food_tag']}
    food_tags = defaultdict(list)
    for row in sorted(tables['self_food_tag'], key=lambda row: row['orderNum']):
        food_tags[row['foodId']].append(tags[row['tagId']])
    food_types = {row['id']: row['name'] for row in tables['food_type']}
    recipes = []
    for row in tables['self_food']:
        labels = food_tags[row['id']]
        recipes.append({
            'key': str(row['id']), 'title': row['name'],
            'subtitle': ' · '.join(labels), 'favorite': bool(row['favorite']),
            'search': '\n'.join([row['name'], row['note'] or '', *labels]),
            'images': images('SELF_MADE', row['id'], row['foodCover'] or ''),
            'description': row['note'] or '', 'tags': labels,
        })
    dishes = defaultdict(list)
    for row in tables['restaurant_food']:
        dishes[row['restaurantId']].append({
            **row, 'images': images('RESTAURANT', row['id'], row['pictureUri'] or ''),
        })
    addresses = defaultdict(list)
    for row in tables['address']:
        addresses[row['restaurantId']].append(row)
    visits = defaultdict(list)
    records = []
    restaurant_names = {row['id']: row['name'] for row in tables['restaurant']}
    for row in tables['consume_record']:
        visits[row['restaurantId']].append(row)
        title = restaurant_names[row['restaurantId']] if row['restaurantId'] in restaurant_names else '未关联餐厅的用餐记录'
        records.append({
            'key': str(row['id']), 'title': title,
            'subtitle': str(row['consumeTime']), 'favorite': False,
            'search': title + '\n' + (row['comment'] or ''),
            'images': images('CONSUME_RECORD', row['id']),
            'description': row['comment'] or '', 'record': row,
        })
    restaurants = []
    for row in tables['restaurant']:
        kind = food_types[row['foodTypeId']]
        restaurant_dishes = dishes[row['id']]
        restaurant_images = list(dict.fromkeys(
            path for dish in restaurant_dishes for path in dish['images']
        ))
        restaurants.append({
            'key': str(row['id']), 'title': row['name'], 'subtitle': kind,
            'favorite': bool(row['favorite']), 'images': restaurant_images,
            'search': '\n'.join([row['name'], kind, row['comment'] or '',
                                  *[dish['name'] for dish in restaurant_dishes if dish['name'] is not None]]),
            'description': row['comment'] or '', 'dishes': restaurant_dishes,
            'addresses': addresses[row['id']], 'visits': visits[row['id']],
        })
    def photo_urls(values):
        return ['aurai-media:' + value for value in values]

    recipe_rows = {str(row['id']): row for row in tables['self_food']}
    recipe_document = [{
        'id': item['key'], 'name': item['title'], 'images': photo_urls(item['images']),
        'tags': item['tags'], 'note': item['description'], 'favorite': item['favorite'],
        'createdAt': recipe_rows[item['key']]['dateAdded'],
        'hiddenRounds': recipe_rows[item['key']]['hideCount'],
    } for item in recipes]
    address_by_id = {row['id']: row for row in tables['address']}
    companions = defaultdict(list)
    for row in tables['eater']:
        companions[row['consumeRecordId']].append(row['eater'])
    foods_by_visit = defaultdict(list)
    for rows in dishes.values():
        for row in rows:
            foods_by_visit[row['consumeRecordId']].append(row)
    restaurant_rows = {str(row['id']): row for row in tables['restaurant']}
    restaurant_document = []
    for item in restaurants:
        visit_document = []
        for row in item['visits']:
            address = address_by_id.get(row['addressId'])
            visit_document.append({
                'id': str(row['id']),
                'date': datetime.fromtimestamp(row['consumeTime'] / 1000, ZoneInfo('Asia/Shanghai')).strftime('%Y-%m-%d'),
                'time': datetime.fromtimestamp(row['consumeTime'] / 1000, ZoneInfo('Asia/Shanghai')).strftime('%H:%M'),
                'autoCost': bool(row['autoCost']),
                'people': len(companions[row['id']]) + 1,
                'companions': '、'.join(companions[row['id']]),
                'totalCents': round(row['totalCost'] * 100),
                'address': ' '.join(address[k] or '' for k in ['province', 'city', 'county', 'address']) if address else '',
                'note': row['comment'] or '',
                'images': photo_urls(images('CONSUME_RECORD', row['id'])),
                'foods': [{
                    'id': str(food['id']), 'name': food['name'] or '未命名菜品',
                    'priceCents': round(food['price'] * 100), 'quantity': food['quantity'],
                    'note': food['comment'] or '',
                    'image': 'aurai-media:' + food['images'][0] if food['images'] else '',
                    'images': photo_urls(food['images']),
                } for food in foods_by_visit[row['id']]],
            })
        restaurant_document.append({
            'id': item['key'], 'name': item['title'], 'cuisine': item['subtitle'],
            'note': item['description'], 'link': restaurant_rows[item['key']]['link'] or '', 'favorite': item['favorite'],
            'createdAt': restaurant_rows[item['key']]['firstVisitTime'],
            'addresses': [{'id': str(row['id']), 'district': row['county'] or '',
                           'address': ' '.join(row[k] or '' for k in ['province', 'city', 'address'])}
                          for row in item['addresses']],
            'visits': visit_document,
        })
    menu_document = {'recipes': recipe_document, 'restaurants': restaurant_document,
                     'menuIds': [], 'filters': {'preferred': [], 'excluded': []},
                     'queue': [row['id'] for row in recipe_document if row['hiddenRounds'] == 0]}
    # Keep every original table and settings, including drafts, lists and tag rules.
    library = {
        'format': 'aurai-library-v1',
        'collections': {'recipes': recipes, 'restaurants': restaurants, 'records': records},
        'documents': {'random_menu.json': menu_document},
        'media': list(media.values()), 'missingMedia': missing, 'legacy': {'tables': tables, 'settings': settings},
    }
    return library, [(row['path'], by_name[name]) for name, row in media.items()]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=pathlib.Path)
    parser.add_argument('output', type=pathlib.Path)
    parser.add_argument('--metadata-only', action='store_true')
    parser.add_argument('--skip-missing-media', action='store_true', help='Explicitly skip absent photos; preserve records and an audit list')
    parser.add_argument('--replace-cover', action='append', default=[], metavar='OLD=NEW', help='Explicit cover replacement, restricted to photos belonging to the same record')
    args = parser.parse_args()
    library, photos = prepare(args.source.resolve(), args.skip_missing_media, dict(value.split('=', 1) for value in args.replace_cover))
    manifest = json.dumps(library, ensure_ascii=False, separators=(',', ':')).encode()
    if len(manifest) > 16 * 1024 * 1024:
        raise ValueError('Metadata exceeds 16 MiB')
    # Exclusive creation protects existing backup and output files.
    if args.metadata_only:
        with args.output.open('xb') as output:
            output.write(manifest)
    else:
        with zipfile.ZipFile(args.output, 'x', compression=zipfile.ZIP_STORED, allowZip64=True) as archive:
            archive.writestr('library.json', manifest)
            for name, source in photos:
                archive.write(source, name)
    print(json.dumps({
        'recipes': len(library['collections']['recipes']),
        'restaurants': len(library['collections']['restaurants']),
        'records': len(library['collections']['records']),
        'photos': len(photos), 'photoBytes': sum(row['bytes'] for row in library['media']),
        'missingMedia': library['missingMedia'], 'metadataBytes': len(manifest), 'output': str(args.output),
    }, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
