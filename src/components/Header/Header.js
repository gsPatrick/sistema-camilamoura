import React from 'react';
import styles from './Header.module.css';

export default function Header() {
    return (
        <header className={styles.header}>
            <div className={styles.breadcrumbs}>
                SYSTEM / <span className={styles.activeCrumb}>CONFIGURATION</span>
            </div>
            <div className={styles.statusContainer}>
                <span className={styles.pulsingDot}></span>
                <span className={styles.statusText}>BOT ACTIVE</span>
            </div>
        </header>
    );
}
