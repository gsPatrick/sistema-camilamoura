'use client';
import React, { useEffect, useState } from 'react';
import styles from './dashboard.module.css';
import { api } from '../../services/api';

const TABS = [
    { id: 'simulator', label: 'Simulador IA', subtitle: 'Teste a Carol (IA) sem gastar mensagens do WhatsApp ou criar cards no Trello.' },
    { id: 'flow', label: 'Fluxo de Triagem', subtitle: 'Configure como o bot interage: perguntas manuais ou geradas por IA.' },
    { id: 'brain', label: 'Especialidades', subtitle: 'Adicione ou remova as áreas de atuação. O robô aprende automaticamente estas regras.' },
    { id: 'knowledge', label: 'Base de Conhecimento', subtitle: 'Suba PDFs e documentos para a IA usar como referência nas respostas.' },
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
    const [knowledgeDocs, setKnowledgeDocs] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingTrello, setLoadingTrello] = useState(false);
    const [saving, setSaving] = useState(false);

    // Flow configuration state
    const [flowConfig, setFlowConfig] = useState({
        mode: 'AI_DYNAMIC',
        aiQuestionCount: 3,
        aiMaxQuestions: 5,
        postAction: 'WAIT_CONTACT',
        trelloTitleTemplate: '{nome}: {telefone}',
        trelloDescTemplate: '**Área:** {area}\n**Telefone:** {telefone}\n**Resumo:** {resumo}\n\n---\n**Relato:**\n{relato}',
        questions: []
    });
    const [trelloPreview, setTrelloPreview] = useState({ title: '', description: '' });
    const [newQuestion, setNewQuestion] = useState({ question: '', variableName: '' });

    // Simulator state
    const [simMessages, setSimMessages] = useState([]);
    const [simInput, setSimInput] = useState('');
    const [simLoading, setSimLoading] = useState(false);

    // Knowledge edit modal state
    const [editingContent, setEditingContent] = useState(null);
    const [contentText, setContentText] = useState('');
    const [showTextModal, setShowTextModal] = useState(false);
    const [newTextDoc, setNewTextDoc] = useState({ title: '', content: '', category: 'geral' });

    useEffect(() => {
        async function load() {
            try {
                setConfigs(await api.getConfigs());
                // Fetch Trello Data immediately to populate dropdowns
                setLoadingTrello(true);
                const tData = await api.getTrelloData();
                setTrelloData(tData);
                // Load knowledge documents
                try {
                    const docs = await api.getKnowledgeDocuments();
                    setKnowledgeDocs(docs);
                } catch (e) { console.log('No knowledge docs yet'); }
                // Load flow config
                try {
                    const flow = await api.getFlowConfig();
                    setFlowConfig(flow);
                    // Update Trello preview
                    const preview = await api.previewTrelloCard(flow.trelloTitleTemplate, flow.trelloDescTemplate);
                    setTrelloPreview(preview.preview);
                } catch (e) { console.log('No flow config yet'); }
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
        try {
            await api.updateConfigs(configs);
            // Also save flow config if on flow tab
            if (activeTab === 'flow') {
                await api.updateFlowConfig(flowConfig);
            }
        } catch (e) { alert('Erro'); } finally { setSaving(false); }
    };

    const updateFlowField = async (field, value) => {
        const newConfig = { ...flowConfig, [field]: value };
        setFlowConfig(newConfig);
        // Update preview in real-time
        if (field === 'trelloTitleTemplate' || field === 'trelloDescTemplate') {
            try {
                const preview = await api.previewTrelloCard(
                    field === 'trelloTitleTemplate' ? value : newConfig.trelloTitleTemplate,
                    field === 'trelloDescTemplate' ? value : newConfig.trelloDescTemplate
                );
                setTrelloPreview(preview.preview);
            } catch (e) { console.error('Preview error:', e); }
        }
    };

    const addQuestion = async () => {
        if (!newQuestion.question || !newQuestion.variableName) {
            alert('Preencha a pergunta e o nome da variável');
            return;
        }
        try {
            const created = await api.addFlowQuestion(newQuestion);
            setFlowConfig(prev => ({
                ...prev,
                questions: [...(prev.questions || []), created]
            }));
            setNewQuestion({ question: '', variableName: '' });
        } catch (e) {
            alert('Erro ao adicionar pergunta');
        }
    };

    const removeQuestion = async (id) => {
        if (!confirm('Remover esta pergunta?')) return;
        try {
            await api.deleteFlowQuestion(id);
            setFlowConfig(prev => ({
                ...prev,
                questions: prev.questions.filter(q => q.id !== id)
            }));
        } catch (e) {
            alert('Erro ao remover');
        }
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

                {activeTab === 'simulator' && (
                    <div className={styles.simulatorSection}>
                        <div className={styles.chatContainer}>
                            <div className={styles.chatMessages}>
                                {simMessages.length === 0 && (
                                    <div className={styles.chatEmpty}>
                                        <span>🤖</span>
                                        <p>Olá! Eu sou a Carol, assistente da Advocacia Camila Moura.</p>
                                        <p>Envie uma mensagem para testar como eu responderia!</p>
                                    </div>
                                )}
                                {simMessages.map((msg, idx) => (
                                    <div key={idx} className={`${styles.chatMessage} ${msg.role === 'user' ? styles.userMessage : styles.botMessage}`}>
                                        <div className={styles.messageContent}>
                                            {msg.role === 'assistant' && <span className={styles.botLabel}>Carol:</span>}
                                            <p>{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                                {simLoading && (
                                    <div className={`${styles.chatMessage} ${styles.botMessage}`}>
                                        <div className={styles.messageContent}>
                                            <span className={styles.botLabel}>Carol:</span>
                                            <p className={styles.typing}>Digitando...</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className={styles.chatInputArea}>
                                <input
                                    type="text"
                                    className={styles.chatInput}
                                    placeholder="Digite uma mensagem de teste..."
                                    value={simInput}
                                    onChange={(e) => setSimInput(e.target.value)}
                                    onKeyPress={async (e) => {
                                        if (e.key === 'Enter' && simInput.trim() && !simLoading) {
                                            const msg = simInput.trim();
                                            setSimInput('');
                                            setSimMessages(prev => [...prev, { role: 'user', content: msg }]);
                                            setSimLoading(true);
                                            try {
                                                const history = simMessages.map(m => ({ role: m.role, content: m.content }));
                                                const result = await api.simulatorChat(msg, history);
                                                setSimMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
                                            } catch (err) {
                                                setSimMessages(prev => [...prev, { role: 'assistant', content: 'Erro: ' + err.message }]);
                                            } finally {
                                                setSimLoading(false);
                                            }
                                        }
                                    }}
                                />
                                <button
                                    className={styles.sendBtn}
                                    disabled={!simInput.trim() || simLoading}
                                    onClick={async () => {
                                        if (simInput.trim() && !simLoading) {
                                            const msg = simInput.trim();
                                            setSimInput('');
                                            setSimMessages(prev => [...prev, { role: 'user', content: msg }]);
                                            setSimLoading(true);
                                            try {
                                                const history = simMessages.map(m => ({ role: m.role, content: m.content }));
                                                const result = await api.simulatorChat(msg, history);
                                                setSimMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
                                            } catch (err) {
                                                setSimMessages(prev => [...prev, { role: 'assistant', content: 'Erro: ' + err.message }]);
                                            } finally {
                                                setSimLoading(false);
                                            }
                                        }
                                    }}
                                >
                                    {simLoading ? '⏳' : '📤'}
                                </button>
                            </div>
                        </div>
                        <div className={styles.simActions}>
                            <button
                                className={styles.resetBtn}
                                onClick={() => setSimMessages([])}
                            >
                                🔄 Limpar Conversa
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'flow' && (
                    <div className={styles.flowSection}>
                        {/* Mode Selector */}
                        <div className={styles.flowModeSelector}>
                            <h3>🎛️ Modo de Operação</h3>
                            <div className={styles.modeOptions}>
                                <label className={`${styles.modeOption} ${flowConfig.mode === 'MANUAL' ? styles.modeActive : ''}`}>
                                    <input
                                        type="radio"
                                        name="mode"
                                        checked={flowConfig.mode === 'MANUAL'}
                                        onChange={() => updateFlowField('mode', 'MANUAL')}
                                    />
                                    <div className={styles.modeContent}>
                                        <strong>📝 Manual</strong>
                                        <span>Você define as perguntas e a ordem</span>
                                    </div>
                                </label>
                                <label className={`${styles.modeOption} ${flowConfig.mode === 'AI_FIXED' ? styles.modeActive : ''}`}>
                                    <input
                                        type="radio"
                                        name="mode"
                                        checked={flowConfig.mode === 'AI_FIXED'}
                                        onChange={() => updateFlowField('mode', 'AI_FIXED')}
                                    />
                                    <div className={styles.modeContent}>
                                        <strong>🤖 IA (Quantidade Fixa)</strong>
                                        <span>IA faz X perguntas que você define</span>
                                    </div>
                                </label>
                                <label className={`${styles.modeOption} ${flowConfig.mode === 'AI_DYNAMIC' ? styles.modeActive : ''}`}>
                                    <input
                                        type="radio"
                                        name="mode"
                                        checked={flowConfig.mode === 'AI_DYNAMIC'}
                                        onChange={() => updateFlowField('mode', 'AI_DYNAMIC')}
                                    />
                                    <div className={styles.modeContent}>
                                        <strong>🧠 IA (Dinâmico)</strong>
                                        <span>IA decide quantas perguntas são necessárias</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Mode-specific configs */}
                        {flowConfig.mode === 'MANUAL' && (
                            <div className={styles.questionsBuilder}>
                                <h3>📋 Perguntas da Triagem</h3>
                                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '20px' }}>
                                    As perguntas serão feitas na ordem em que aparecem. A IA analisa todas as respostas ao final.
                                </p>

                                {/* Questions List */}
                                <div className={styles.questionsList}>
                                    {(flowConfig.questions || []).map((q, idx) => (
                                        <div key={q.id} className={styles.questionItem}>
                                            <span className={styles.questionOrder}>{idx + 1}</span>
                                            <div className={styles.questionContent}>
                                                <strong>{q.question}</strong>
                                                <small>Variável: {'{' + q.variableName + '}'}</small>
                                            </div>
                                            <button
                                                onClick={() => removeQuestion(q.id)}
                                                className={styles.removeQuestionBtn}
                                            >🗑️</button>
                                        </div>
                                    ))}
                                </div>

                                {/* Add Question Form */}
                                <div className={styles.addQuestionForm}>
                                    <input
                                        type="text"
                                        placeholder="Nova pergunta (ex: Qual seu nome completo?)"
                                        value={newQuestion.question}
                                        onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
                                        className={styles.input}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Variável (ex: nome)"
                                        value={newQuestion.variableName}
                                        onChange={(e) => setNewQuestion(prev => ({ ...prev, variableName: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                                        className={styles.input}
                                        style={{ maxWidth: '200px' }}
                                    />
                                    <button onClick={addQuestion} className={styles.addQuestionBtn}>+ Adicionar</button>
                                </div>
                            </div>
                        )}

                        {flowConfig.mode === 'AI_FIXED' && (
                            <div className={styles.aiConfig}>
                                <h3>🔢 Quantidade de Perguntas</h3>
                                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '20px' }}>
                                    A IA vai fazer exatamente {flowConfig.aiQuestionCount} pergunta(s) para extrair todas as informações necessárias.
                                </p>
                                <div className={styles.sliderContainer}>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        value={flowConfig.aiQuestionCount}
                                        onChange={(e) => updateFlowField('aiQuestionCount', parseInt(e.target.value))}
                                        className={styles.slider}
                                    />
                                    <span className={styles.sliderValue}>{flowConfig.aiQuestionCount} perguntas</span>
                                </div>
                            </div>
                        )}

                        {flowConfig.mode === 'AI_DYNAMIC' && (
                            <div className={styles.aiConfig}>
                                <h3>🧠 Limite Máximo</h3>
                                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '20px' }}>
                                    A IA decide quando tem informação suficiente. Máximo de {flowConfig.aiMaxQuestions} perguntas.
                                </p>
                                <div className={styles.sliderContainer}>
                                    <input
                                        type="range"
                                        min="3"
                                        max="7"
                                        value={flowConfig.aiMaxQuestions}
                                        onChange={(e) => updateFlowField('aiMaxQuestions', parseInt(e.target.value))}
                                        className={styles.slider}
                                    />
                                    <span className={styles.sliderValue}>Máx: {flowConfig.aiMaxQuestions}</span>
                                </div>
                            </div>
                        )}

                        {/* Post-Action Selector */}
                        <div className={styles.postActionSelector}>
                            <h3>📤 Após a Triagem</h3>
                            <div className={styles.postOptions}>
                                <label className={`${styles.postOption} ${flowConfig.postAction === 'WAIT_CONTACT' ? styles.postActive : ''}`}>
                                    <input
                                        type="radio"
                                        name="postAction"
                                        checked={flowConfig.postAction === 'WAIT_CONTACT'}
                                        onChange={() => updateFlowField('postAction', 'WAIT_CONTACT')}
                                    />
                                    <div>
                                        <strong>⏳ Aguardar Contato</strong>
                                        <span>Sistema diz "entraremos em contato" e encerra</span>
                                    </div>
                                </label>
                                <label className={`${styles.postOption} ${flowConfig.postAction === 'AI_RESPONSE' ? styles.postActive : ''}`}>
                                    <input
                                        type="radio"
                                        name="postAction"
                                        checked={flowConfig.postAction === 'AI_RESPONSE'}
                                        onChange={() => updateFlowField('postAction', 'AI_RESPONSE')}
                                    />
                                    <div>
                                        <strong>💬 IA Responde</strong>
                                        <span>IA continua conversando e responde dúvidas</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Trello Template Config */}
                        <div className={styles.trelloConfig}>
                            <h3>📋 Layout do Card no Trello</h3>
                            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '20px' }}>
                                Use variáveis: {'{nome}'}, {'{telefone}'}, {'{area}'}, {'{resumo}'}, {'{relato}'}, {'{urgencia}'}
                            </p>

                            <div className={styles.trelloInputs}>
                                <div className={styles.inputRow}>
                                    <label className={styles.label}>Título do Card</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={flowConfig.trelloTitleTemplate || ''}
                                        onChange={(e) => updateFlowField('trelloTitleTemplate', e.target.value)}
                                        placeholder="{nome}: {telefone}"
                                    />
                                </div>
                                <div className={styles.inputRow}>
                                    <label className={styles.label}>Descrição do Card</label>
                                    <textarea
                                        className={styles.textarea}
                                        style={{ minHeight: '150px' }}
                                        value={flowConfig.trelloDescTemplate || ''}
                                        onChange={(e) => updateFlowField('trelloDescTemplate', e.target.value)}
                                        placeholder="**Área:** {area}..."
                                    />
                                </div>
                            </div>

                            {/* Live Preview */}
                            <div className={styles.trelloPreview}>
                                <h4>👁️ Preview do Card</h4>
                                <div className={styles.trelloCard}>
                                    <div className={styles.trelloCardTitle}>{trelloPreview.title || 'MARIA SILVA: 5571999887766'}</div>
                                    <div className={styles.trelloCardDesc}>
                                        <pre>{trelloPreview.description || '**Área:** Previdenciário\n**Telefone:** 5571999887766\n**Resumo:** Solicitação de aposentadoria'}</pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'brain' && renderSpecialties()}

                {activeTab === 'knowledge' && (
                    <div className={styles.knowledgeSection}>
                        {/* Upload Area */}
                        <div className={styles.uploadArea}>
                            <input
                                type="file"
                                id="pdf-upload"
                                accept=".pdf"
                                multiple
                                style={{ display: 'none' }}
                                onChange={async (e) => {
                                    const files = Array.from(e.target.files);
                                    if (files.length === 0) return;

                                    setUploading(true);
                                    try {
                                        for (const file of files) {
                                            await api.uploadKnowledgePdf(file, file.name, 'geral');
                                        }
                                        const docs = await api.getKnowledgeDocuments();
                                        setKnowledgeDocs(docs);
                                        alert(`${files.length} arquivo(s) enviado(s) com sucesso!`);
                                    } catch (err) {
                                        alert('Erro ao enviar: ' + err.message);
                                    } finally {
                                        setUploading(false);
                                        e.target.value = '';
                                    }
                                }}
                            />
                            <label htmlFor="pdf-upload" className={styles.uploadBtn}>
                                {uploading ? (
                                    <span>⏳ ENVIANDO...</span>
                                ) : (
                                    <>
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="17 8 12 3 7 8" />
                                            <line x1="12" y1="3" x2="12" y2="15" />
                                        </svg>
                                        <span>CLIQUE PARA ENVIAR PDFs</span>
                                        <small>ou arraste arquivos aqui</small>
                                    </>
                                )}
                            </label>
                        </div>

                        {/* Documents List */}
                        <div className={styles.docsList}>
                            <h3 style={{ marginBottom: '15px', fontWeight: '300', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
                                📚 Documentos na Base ({knowledgeDocs.length})
                            </h3>

                            {knowledgeDocs.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                                    <p>Nenhum documento ainda.</p>
                                    <p>Suba PDFs para a IA usar como referência!</p>
                                </div>
                            ) : (
                                <div className={styles.docsGrid}>
                                    {knowledgeDocs.map(doc => (
                                        <div key={doc.id} className={styles.docCard}>
                                            <div className={styles.docIcon}>📄</div>
                                            <div className={styles.docInfo}>
                                                <strong>{doc.title}</strong>
                                                <small>{doc.category} • {new Date(doc.createdAt).toLocaleDateString('pt-BR')}</small>
                                            </div>
                                            <div className={styles.docActions}>
                                                <button
                                                    onClick={() => setSelectedDoc(doc)}
                                                    title="Ver resumo"
                                                    className={styles.docActionBtn}
                                                >
                                                    👁️
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('Remover este documento?')) return;
                                                        try {
                                                            await api.deleteKnowledgeDocument(doc.id);
                                                            setKnowledgeDocs(prev => prev.filter(d => d.id !== doc.id));
                                                        } catch (err) {
                                                            alert('Erro ao remover');
                                                        }
                                                    }}
                                                    title="Remover"
                                                    className={styles.docActionBtn}
                                                    style={{ color: '#c00' }}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                            <label className={styles.toggleSwitch}>
                                                <input
                                                    type="checkbox"
                                                    checked={doc.isActive}
                                                    onChange={async (e) => {
                                                        try {
                                                            await api.updateKnowledgeDocument(doc.id, { isActive: e.target.checked });
                                                            setKnowledgeDocs(prev => prev.map(d =>
                                                                d.id === doc.id ? { ...d, isActive: e.target.checked } : d
                                                            ));
                                                        } catch (err) {
                                                            alert('Erro ao atualizar');
                                                        }
                                                    }}
                                                />
                                                <span className={styles.toggleSlider}></span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Preview Modal */}
                        {selectedDoc && (
                            <div className={styles.modal} onClick={() => setSelectedDoc(null)}>
                                <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                                    <button className={styles.modalClose} onClick={() => setSelectedDoc(null)}>×</button>
                                    <h2>{selectedDoc.title}</h2>
                                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>
                                        Categoria: {selectedDoc.category} | Arquivo: {selectedDoc.fileName}
                                    </p>
                                    <div className={styles.docPreview}>
                                        <h4>📝 Resumo do Conteúdo:</h4>
                                        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                            {selectedDoc.summary || 'Sem resumo disponível'}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

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
