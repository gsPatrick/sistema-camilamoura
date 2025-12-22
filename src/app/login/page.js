'use client';
import React, { useState } from 'react';
import styles from './login.module.css';
import { api } from '../../services/api';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
                    <div className={styles.subtitle}>Acesso ao Sistema</div>
                    <h1 className={styles.title}>Advocacia<br />Camila Moura</h1>
                </div>

                <form onSubmit={handleLogin} className={styles.form}>
                    <div>
                        <label className={styles.hiddenLabel}>E-mail</label>
                        <input
                            type="email"
                            className={styles.input}
                            placeholder="SEU E-MAIL"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className={styles.hiddenLabel}>Senha</label>
                        <input
                            type="password"
                            className={styles.input}
                            placeholder="SUA SENHA"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={loading}>
                        {loading ? 'AUTENTICANDO...' : 'ENTRAR NO SISTEMA'}
                    </button>
                </form>
            </div>
        </div>
    );
}
