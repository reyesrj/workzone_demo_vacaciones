import React from 'react';
import '../styles/workzone.css';

interface Ui5CardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  action?: React.ReactNode;
}

const Ui5Card: React.FC<Ui5CardProps> = ({
  title,
  subtitle,
  children,
  className,
  style,
  action,
}) => (
  <div className={`wz-card${className ? ` ${className}` : ''}`} style={style}>
    <div className="wz-card-header">
      <div className="wz-card-header-text">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
    <div className="wz-card-body">{children}</div>
  </div>
);

export default Ui5Card;
