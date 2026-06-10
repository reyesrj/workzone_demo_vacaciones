import React from 'react';
import '../styles/workzone.css';

interface SpacePageProps {
  spaceName: string;
  pageName: string;
  children: React.ReactNode;
}

const SpacePage: React.FC<SpacePageProps> = ({ spaceName, pageName, children }) => (
  <div className="wz-space-page">
    <div className="wz-breadcrumb">{spaceName} › {pageName}</div>
    <h2 className="wz-page-heading">{pageName}</h2>
    <div style={{ width: '100%' }}>{children}</div>
  </div>
);

export default SpacePage;
