import { Icon } from "../components/Icon";
import { ActionLink } from "../components/Shared";

export function Plan() {
  return (
    <>
      <div className="plan-intro">
        <span className="plan-icon">
          <Icon name="sparkles" size={30} />
        </span>
        <h2>一餐刚刚好的搭配</h2>
        <p>
          人数、口味、手边的食材，
          <br />
          都是一份好菜单的开始。
        </p>
      </div>
      <section className="section">
        <div className="section-heading">
          <h2>从你的需求出发</h2>
        </div>
        <dl className="requirements">
          <div>
            <dt>
              <Icon name="personal" size={21} />
              用餐安排
            </dt>
            <dd>几个人吃，想做几道菜</dd>
          </div>
          <div>
            <dt>
              <Icon name="leaf" size={21} />
              口味与忌口
            </dt>
            <dd>喜欢的味道，需要避开的食材</dd>
          </div>
          <div>
            <dt>
              <Icon name="dishes" size={21} />
              现有食材
            </dt>
            <dd>优先用上手边已有的食材</dd>
          </div>
          <div>
            <dt>
              <Icon name="clock" size={21} />
              做饭时间
            </dt>
            <dd>快手一餐，或慢慢做顿好的</dd>
          </div>
        </dl>
      </section>
      <div className="plan-footer">
        <p className="availability">AI 配菜单即将开放</p>
        <ActionLink to="/dishes" secondary>
          先逛逛菜谱
        </ActionLink>
      </div>
    </>
  );
}
