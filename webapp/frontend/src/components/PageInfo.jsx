import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

const PageInfo = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Info Button */}
      <button 
        className="page-info-button" 
        onClick={() => setIsOpen(true)}
        title="Bu sayfa nasıl kullanılır?"
      >
        <Info size={24} />
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="page-info-overlay" onClick={() => setIsOpen(false)}>
          <div className="page-info-modal" onClick={(e) => e.stopPropagation()}>
            <div className="page-info-header">
              <h2>{title}</h2>
              <button className="page-info-close" onClick={() => setIsOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="page-info-content">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PageInfo;
