import React from 'react';
import styles from './ConfigCard.module.css';

export default function ConfigCard({ title, icon, children }) {
    return (
        <div className={`glass-card ${styles.card}`}>
            <div className={styles.header}>
                <span className={styles.icon}>{icon}</span>
                <h3 className={styles.title}>{title}</h3>
            </div>
            <div className={styles.content}>
                {children}
            </div>
        </div>
    );
}
