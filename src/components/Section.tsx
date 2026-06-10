import React from 'react';
import '../styles/workzone.css';

interface SectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

const Section: React.FC<SectionProps> = ({ title, subtitle, children, className }) => (
  <section className={`wz-section${className ? ` ${className}` : ''}`}>
    <div className="wz-section-header">
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
    </div>
    <div className="wz-section-body">{children}</div>
  </section>
);

export default Section;
