import React from 'react';

const HtmlRenderer: React.FC<{ htmlContent: string }> = ({ htmlContent }) => {
  return (
    <div className="prose" dangerouslySetInnerHTML={{ __html: htmlContent }} />
  );
};

export default HtmlRenderer;
