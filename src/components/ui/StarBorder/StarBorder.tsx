import React from 'react';
import './StarBorder.css';

interface StarBorderProps {
  className?: string;
  color?: string;
  speed?: string;
  children: React.ReactNode;
  /** 自定义内部按钮样式 */
  innerClassName?: string;
}

const StarBorder: React.FC<StarBorderProps> = ({
  className = '',
  color = '#30E787',
  speed = '6s',
  children,
  innerClassName = '',
}) => {
  return (
    <div className={`star-border-container ${className}`}>
      <div className="border-gradient-bottom"
        style={{ background: `radial-gradient(circle, ${color}, transparent 10%)`, animationDuration: speed }}
      />
      <div className="border-gradient-top"
        style={{ background: `radial-gradient(circle, ${color}, transparent 10%)`, animationDuration: speed }}
      />
      <div className={`star-inner ${innerClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default StarBorder;
