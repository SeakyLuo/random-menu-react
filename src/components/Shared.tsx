import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function ActionLink({
  to,
  children,
  secondary = false,
}: {
  to: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <a
      className={`button ${secondary ? "secondary" : "primary"}`}
      href={`#${to}`}
    >
      {children}
      <Icon name="arrow" size={18} />
    </a>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon: IconName;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon name={icon} size={38} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {children && <div className="empty-actions">{children}</div>}
    </div>
  );
}

export function MenuLink({
  to,
  icon,
  title,
  detail,
  value,
}: {
  to: string;
  icon: IconName;
  title: string;
  detail?: string;
  value?: string;
}) {
  return (
    <a className="menu-link" href={`#${to}`}>
      <span className="menu-icon">
        <Icon name={icon} />
      </span>
      <span className="menu-label">
        {title}
        {detail && <small>{detail}</small>}
      </span>
      {value && <span className="menu-value">{value}</span>}
      <Icon name="chevron" size={18} />
    </a>
  );
}
