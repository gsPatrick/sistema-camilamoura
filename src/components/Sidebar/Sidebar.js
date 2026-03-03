import React from 'react';
import styles from './Sidebar.module.css';

export default function Sidebar() {
    return (
        <aside className={styles.sidebar}>
            <div className={styles.brand}>CM</div>
            <nav className={styles.nav}>
                {/* Usando Emojis como placeholder de ícones minimalistas */}
                <a href="#" className={`${styles.link} ${styles.active}`} title="Config">⚙</a>
                <a href="#" className={styles.link} title="Leads">▢</a>
                <a href="#" className={styles.link} title="History">≡</a>
            </nav>
        </aside>
    );
}
