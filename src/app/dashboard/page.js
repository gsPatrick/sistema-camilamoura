'use client';
import React, { useEffect, useState } from 'react';
import styles from './dashboard.module.css';
import { api } from '../../services/api';

const TABS = [
    { id: 'brain', label: 'Especialidades', subtitle: 'Adicione ou remova as áreas de atuação. O robô aprende automaticamente estas regras.' },
    { id: 'first_contact', label: 'Primeiro Contato', subtitle: 'A mensagem de boas-vindas e aviso ético que todo cliente recebe.' },
    { id: 'urgency', label: 'Urgências', subtitle: 'Texto enviado automaticamente quando o caso é crítico (Doença, Acidente, Liminar).' },
    { id: 'connection', label: 'Conexão', subtitle: 'Configure para onde os leads qualificados devem ir no Trello.' },
    { id: 'integrations', label: 'Integrações', subtitle: 'Configure as chaves de API (WhatsApp, Trello, OpenAI) sem mexer em código.' },
];

// Mini Component for Password Input
const PasswordInput = ({ label, value, onChange }) => {
    const [show, setShow] = useState(false);
    return (
        <div className={styles.inputRow}>
            <label className={styles.label}>{label}</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                    type={show ? 'text' : 'password'}
                    className={styles.input}
                    style={{ paddingRight: '40px' }}
                    value={value || ''}
                    onChange={onChange}
                    placeholder="••••••••••••••"
                />
                <span
                    onClick={() => setShow(!show)}
                    style={{
                        position: 'absolute', right: '10px', cursor: 'pointer',
                        opacity: 0.6, fontSize: '1.2rem'
                    }}
                    title={show ? 'Ocultar' : 'Mostrar'}
                >
                    {show ? '👁️' : '🔒'}
                </span>
            </div>
        </div>
    );
};

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('brain');
    const [activeIntTab, setActiveIntTab] = useState('whatsapp'); // Sub-tab state for Integrations

    const [configs, setConfigs] = useState({
        SPECIALTIES_JSON: '[]', AVISO_ETICO: '', MSG_PRESENCIAL: '',
        TRELLO_LIST_ID: '', TRELLO_LABEL_URGENTE_ID: '',
        OPENAI_API_KEY: '',
        ZAPI_INSTANCE_ID: '', ZAPI_TOKEN: '', ZAPI_CLIENT_TOKEN: '',
        TRELLO_KEY: '', TRELLO_TOKEN: '', TRELLO_BOARD_ID: ''
    });
    const [trelloData, setTrelloData] = useState({ lists: [], labels: [] });
    const [loading, setLoading] = useState(true);
    const [loadingTrello, setLoadingTrello] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                setConfigs(await api.getConfigs());
                // Fetch Trello Data immediately to populate dropdowns
                setLoadingTrello(true);
                const tData = await api.getTrelloData();
                setTrelloData(tData);
            } catch (e) { console.error(e); }
            finally {
                setLoading(false);
                setLoadingTrello(false);
            }
        }
        load();
    }, []);

    const handleChange = (key, value) => setConfigs(prev => ({ ...prev, [key]: value }));
    const handleSave = async () => {
        setSaving(true);
        try { await api.updateConfigs(configs); } catch (e) { alert('Erro'); } finally { setSaving(false); }
    };

    const currentTabInfo = TABS.find(t => t.id === activeTab);

    if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>CARREGANDO O SISTEMA...</div>;

    // Render Specialty Card
    const renderSpecialties = () => {
        let specialties = [];
        try {
            specialties = JSON.parse(configs.SPECIALTIES_JSON || '[]');
        } catch (e) { console.error('JSON Error', e); }

        const updateSpecialty = (id, field, value) => {
            const newSpecs = specialties.map(s => s.id === id ? { ...s, [field]: value } : s);
            handleChange('SPECIALTIES_JSON', JSON.stringify(newSpecs));
        };

        const addSpecialty = () => {
            const newId = specialties.length > 0 ? Math.max(...specialties.map(s => s.id)) + 1 : 1;
            const newSpecs = [...specialties, { id: newId, name: 'Nova Especialidade', keywords: '', rules: '', urgent: false }];
            handleChange('SPECIALTIES_JSON', JSON.stringify(newSpecs));
        };

        const removeSpecialty = (id) => {
            if (!confirm('Tem certeza?')) return;
            const newSpecs = specialties.filter(s => s.id !== id);
            handleChange('SPECIALTIES_JSON', JSON.stringify(newSpecs));
        };

        return (
            <div className={styles.cardsGrid}>
                {specialties.map(spec => (
                    <div key={spec.id} className={styles.specialtyCard}>
                        <div className={styles.cardHeader}>
                            <span className={styles.cardTitle}>#{spec.id}</span>
                            <span className={styles.removeBtn} onClick={() => removeSpecialty(spec.id)} title="Remover">×</span>
                        </div>

                        <div className={styles.cardInputGroup}>
                            <label className={styles.cardLabel}>Nome do Serviço</label>
                            <input
                                className={styles.cardInput}
                                value={spec.name}
                                onChange={(e) => updateSpecialty(spec.id, 'name', e.target.value)}
                            />
                        </div>

                        <div className={styles.cardInputGroup}>
                            <label className={styles.cardLabel}>Palavras-Chave</label>
                            <input
                                className={styles.cardInput}
                                value={spec.keywords}
                                placeholder="Ex: idoso, bpc"
                                onChange={(e) => updateSpecialty(spec.id, 'keywords', e.target.value)}
                            />
                        </div>

                        <div className={styles.cardInputGroup}>
                            <label className={styles.cardLabel}>Regras Específicas</label>
                            <textarea
                                className={styles.cardTextarea}
                                value={spec.rules}
                                placeholder="Ex: Renda < 1/4 salário..."
                                onChange={(e) => updateSpecialty(spec.id, 'rules', e.target.value)}
                            />

                        </div>

                        <div className={styles.cardInputGroup}>
                            <label className={styles.cardLabel}>Etiqueta Trello (Cor)</label>
                            {loadingTrello ? (
                                <div className={`${styles.skeleton}`} style={{ height: '40px' }}></div>
                            ) : (
                                <select
                                    className={styles.select}
                                    value={spec.labelId || ''}
                                    onChange={(e) => updateSpecialty(spec.id, 'labelId', e.target.value)}
                                >
                                    <option value="">Sem etiqueta</option>
                                    {trelloData.labels.map(l => (
                                        <option key={l.id} value={l.id} style={{ color: l.color }}>{l.name ? l.name : l.color} ({l.color})</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className={styles.toggleRow}>
                            <span className={styles.urgentLabel}>
                                {spec.urgent ? (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C59D5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                        ALTA URGÊNCIA
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        NORMAL
                                    </>
                                )}
                            </span>
                            <label className={styles.switch}>
                                <input
                                    type="checkbox"
                                    checked={spec.urgent}
                                    onChange={(e) => updateSpecialty(spec.id, 'urgent', e.target.checked)}
                                />
                                <span className={styles.slider}></span>
                            </label>
                        </div>
                    </div>
                ))}

                {/* Add Button */}
                <button className={styles.addBtn} onClick={addSpecialty}>
                    <div className={styles.addIcon}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
                    <span>ADICIONAR NOVA<br />ESPECIALIDADE</span>
                </button>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            {/* 1. Header Minimalista */}
            <header className={styles.header}>
                <div className={styles.brand}>ADVOCACIA CAMILA MOURA</div>
                <div className={styles.logout}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </div>
            </header>

            {/* 2. Navegação por Abas (Gigantes) */}
            <nav className={styles.tabsNav}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`${styles.tabBtn} ${activeTab === tab.id ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            {/* 3. Área de Conteúdo Focada */}
            <main className={styles.contentArea}>
                <h1 className={styles.sectionTitle}>{currentTabInfo.label}</h1>
                <span className={styles.sectionSubtitle}>{currentTabInfo.subtitle}</span>

                {activeTab === 'brain' && renderSpecialties()}

                {activeTab === 'first_contact' && (
                    <textarea
                        className={styles.textarea}
                        value={configs.AVISO_ETICO}
                        onChange={(e) => handleChange('AVISO_ETICO', e.target.value)}
                    />
                )}

                {activeTab === 'urgency' && (
                    <textarea
                        className={styles.textarea}
                        value={configs.MSG_PRESENCIAL}
                        onChange={(e) => handleChange('MSG_PRESENCIAL', e.target.value)}
                    />
                )}

                {activeTab === 'connection' && (
                    <div style={{ maxWidth: '800px' }}>
                        <div className={styles.inputRow}>
                            <label className={styles.label}>Lista de Triagem (Onde novos leads caem)</label>
                            {loadingTrello ? (
                                <div className={`${styles.skeleton} ${styles.skeletonInput}`}></div>
                            ) : (
                                <select
                                    className={styles.select}
                                    value={configs.TRELLO_LIST_ID}
                                    onChange={(e) => handleChange('TRELLO_LIST_ID', e.target.value)}
                                >
                                    <option value="">Selecione uma lista...</option>
                                    {trelloData.lists.map(list => (
                                        <option key={list.id} value={list.id}>{list.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div className={styles.inputRow}>
                            <label className={styles.label}>Etiqueta de Alta Urgência</label>
                            {loadingTrello ? (
                                <div className={`${styles.skeleton} ${styles.skeletonInput}`}></div>
                            ) : (
                                <select
                                    className={styles.select}
                                    value={configs.TRELLO_LABEL_URGENTE_ID}
                                    onChange={(e) => handleChange('TRELLO_LABEL_URGENTE_ID', e.target.value)}
                                >
                                    <option value="">Selecione uma etiqueta...</option>
                                    {trelloData.labels.map(label => (
                                        <option key={label.id} value={label.id}>
                                            {label.name ? label.name : '(Sem nome)'} - {label.color}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'integrations' && (
                    <div style={{ maxWidth: '800px' }}>
                        {/* Sub-tabs Navigation */}
                        <div style={{ display: 'flex', gap: '30px', marginBottom: '30px', borderBottom: '1px solid #ddd' }}>
                            {['whatsapp', 'ai', 'trello'].map(tabKey => (
                                <button
                                    key={tabKey}
                                    onClick={() => setActiveIntTab(tabKey)}
                                    style={{
                                        padding: '10px 0',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: activeIntTab === tabKey ? 'bold' : 'normal',
                                        borderBottom: activeIntTab === tabKey ? '2px solid black' : '2px solid transparent',
                                        opacity: activeIntTab === tabKey ? 1 : 0.5,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {tabKey === 'whatsapp' && 'WHATSAPP (Z-API)'}
                                    {tabKey === 'ai' && 'OPENAI (IA)'}
                                    {tabKey === 'trello' && 'TRELLO CRM'}
                                </button>
                            ))}
                        </div>

                        {/* Content based on sub-tab */}
                        {activeIntTab === 'whatsapp' && (
                            <div className={styles.fadeIn}>
                                <PasswordInput label="Instance ID" value={configs.ZAPI_INSTANCE_ID} onChange={(e) => handleChange('ZAPI_INSTANCE_ID', e.target.value)} />
                                <PasswordInput label="Instance Token" value={configs.ZAPI_TOKEN} onChange={(e) => handleChange('ZAPI_TOKEN', e.target.value)} />
                                <PasswordInput label="Client Token" value={configs.ZAPI_CLIENT_TOKEN} onChange={(e) => handleChange('ZAPI_CLIENT_TOKEN', e.target.value)} />
                                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '10px' }}>Configure sua conexão com o WhatsApp via Z-API.</p>
                            </div>
                        )}

                        {activeIntTab === 'ai' && (
                            <div className={styles.fadeIn}>
                                <PasswordInput label="OpenAI API Key" value={configs.OPENAI_API_KEY} onChange={(e) => handleChange('OPENAI_API_KEY', e.target.value)} />
                                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '10px' }}>Chave da API da OpenAI para inteligência do sistema.</p>
                            </div>
                        )}

                        {activeIntTab === 'trello' && (
                            <div className={styles.fadeIn}>
                                <PasswordInput label="API Key" value={configs.TRELLO_KEY} onChange={(e) => handleChange('TRELLO_KEY', e.target.value)} />
                                <PasswordInput label="API Token" value={configs.TRELLO_TOKEN} onChange={(e) => handleChange('TRELLO_TOKEN', e.target.value)} />
                                <div className={styles.inputRow}>
                                    <label className={styles.label}>Board ID</label>
                                    <input
                                        className={styles.input}
                                        value={configs.TRELLO_BOARD_ID}
                                        onChange={(e) => handleChange('TRELLO_BOARD_ID', e.target.value)}
                                    />
                                </div>
                                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '10px' }}>Credenciais para leitura e escrita no Trello.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* 4. Footer de Ação */}
            <footer className={styles.actionFooter}>
                <span className={styles.statusText}>
                    {activeTab === 'integrations' ? '⚠️ As alterações de conexão podem levar até 1 minuto para sincronizar.' : (saving ? 'Salvando...' : 'Alterações salvas automaticamente ao clicar')}
                </span>
                <button className={styles.publishBtn} onClick={handleSave} disabled={saving}>
                    {saving ? 'PUBLICANDO...' : 'PUBLICAR ALTERAÇÕES'}
                </button>
            </footer>
        </div>
    );
}
