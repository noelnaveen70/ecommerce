import React, { useEffect } from 'react';
import styles from './Snackbar.module.css';

const Snackbar = ({ message, type, onClose, duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  // Get the appropriate icon based on message type
  const getIcon = () => {
    if (type === 'success') {
      return <i className="fas fa-check-circle"></i>;
    } else if (type === 'error') {
      return <i className="fas fa-exclamation-circle"></i>;
    } else {
      return <i className="fas fa-info-circle"></i>;
    }
  };

  // Format multi-line messages with special handling for rejection/suspension reasons
  const formatMessage = () => {
    if (typeof message !== 'string') return message;
    
    // Split message by newline
    const lines = message.split('\n');
    
    return lines.map((line, index) => {
      // Check if this is a reason line
      const isReasonLine = line.startsWith('Reason:');
      
      return (
        <p 
          key={index} 
          className={isReasonLine ? styles.reasonLine : index > 0 ? styles.detailLine : ''}
        >
          {line}
        </p>
      );
    });
  };

  return (
    <div className={`${styles.snackbar} ${styles[type]}`}>
      <div className={styles.content}>
        <span className={styles.icon}>{getIcon()}</span>
        <span className={styles.message}>{formatMessage()}</span>
      </div>
      <button className={styles.closeButton} onClick={onClose}>
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};

export default Snackbar; 