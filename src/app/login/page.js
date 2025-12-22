'use client';
import React, { useState } from 'react';
import styles from './login.module.css';
import { api } from '../../services/api';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('patrick@gmail.com');
    const [password, setPassword] = useState('patrick123');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.login(email, password);
            router.push('/dashboard');
        } catch (error) {
            alert('Acesso Negado');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.loginContainer}>
            <div className={styles.loginContent}>
                <div className={styles.header}>
                    <div className={styles.subtitle}>System Access</div>
                    <h1 className={styles.title}>Advocacia<br />Camila Moura</h1>
                </div>

                <form onSubmit={handleLogin} className={styles.form}>
                    <div>
                        <label className={styles.hiddenLabel}>Email</label>
                        <input
                            type="email"
                            className={styles.input}
                            placeholder="IDENTIFIER / EMAIL"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className={styles.hiddenLabel}>Password</label>
                        <input
                            type="password"
                            className={styles.input}
                            placeholder="PASSPHRASE"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={loading}>
                        {loading ? 'AUTHENTICATING...' : 'ENTER SYSTEM'}
                    </button>
                </form>
            </div>
        </div>
    );
}
