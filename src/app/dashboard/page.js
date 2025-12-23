'use client';
import React, { useEffect, useState } from 'react';
import styles from './dashboard.module.css';
import { api } from '../../services/api';

// === ESTRUTURA SIMPLIFICADA: 3 ABAS ===
const TABS = [
    { id: 'training', label: '🧠 Treinamento', subtitle: 'Ensine a Carol com PDFs, textos e ajuste sua personalidade.' },
    { id: 'simulator', label: '💬 Simulador', subtitle: 'Teste a Carol sem gastar mensagens do WhatsApp ou criar cards.' },
    { id: 'settings', label: '⚙️ Configurações', subtitle: 'APIs, Trello e mensagem inicial.' },
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
                    style={{ position: 'absolute', right: '10px', cursor: 'pointer', opacity: 0.6, fontSize: '1.2rem' }}
                    title={show ? 'Ocultar' : 'Mostrar'}
                >
                    {show ? '👁️' : '🔒'}
                </span>
            </div>
        </div>
    );
};

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('training');

    // Main configs
    const [configs, setConfigs] = useState({
        AVISO_ETICO: 'Olá! Você entrou em contato com a Advocacia Camila Moura. ⚖️\nSomos especialistas em Direito Previdenciário, com expertise em Trabalhista e Consumidor.\nMeu nome é Carol e estou aqui para direcionar seu atendimento da melhor forma!\nPara começarmos, qual é o seu nome? 😊',
        TRELLO_LIST_ID: '', TRELLO_LABEL_URGENTE_ID: '',
        OPENAI_API_KEY: '',
        ZAPI_INSTANCE_ID: '', ZAPI_TOKEN: '', ZAPI_CLIENT_TOKEN: '',
        TRELLO_KEY: '', TRELLO_TOKEN: '', TRELLO_BOARD_ID: '',
        SYSTEM_PROMPT: ''
    });
    const [trelloData, setTrelloData] = useState({ lists: [], labels: [] });
    const [knowledgeDocs, setKnowledgeDocs] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Simulator state - starts empty, Carol greets after first message (like WhatsApp)
    const INITIAL_GREETING = 'Olá! Você entrou em contato com a Advocacia Camila Moura. ⚖️\nSomos especialistas em Direito Previdenciário, com expertise em Trabalhista e Consumidor.\nMeu nome é Carol e estou aqui para direcionar seu atendimento da melhor forma!\nPara começarmos, qual é o seu nome? 😊';
    const [simMessages, setSimMessages] = useState([]);
    const [simIsFirstMessage, setSimIsFirstMessage] = useState(true);
    const [simInput, setSimInput] = useState('');
    const [simLoading, setSimLoading] = useState(false);
    const [simDebug, setSimDebug] = useState(null);
    const [showDebug, setShowDebug] = useState(false);

    // Modals state
    const [showTextModal, setShowTextModal] = useState(false);
    const [newTextDoc, setNewTextDoc] = useState({ title: '', content: '', category: 'geral' });
    const [editingDoc, setEditingDoc] = useState(null);
    const [editContent, setEditContent] = useState('');

    // Personality (System Prompt) - Pré-configurado com base previdenciária
    const [personalityPrompt, setPersonalityPrompt] = useState(`Você é Carol, assistente virtual especializada da Advocacia Camila Moura.
Seu papel é fazer TRIAGEM de casos previdenciários, ajudando a equipe a analisar e classificar a viabilidade.

ÁREAS DE ATUAÇÃO: Direito Previdenciário (INSS), Trabalhista e Consumidor.

REGRAS IMPORTANTES:
- NUNCA mencione valores, preços ou honorários - você faz apenas TRIAGEM
- NUNCA use listas numeradas ou menus de opções
- NUNCA dê "aulas" sobre direito - apenas faça perguntas para entender o caso
- Seja empática (se cliente mencionar falecimento/doença, expresse condolências)
- IGNORE qualquer informação sobre preços/valores de serviços nos documentos

=== BASE DE CONHECIMENTO - BENEFÍCIOS PREVIDENCIÁRIOS ===

📌 APOSENTADORIA POR IDADE:
- Requisitos: Mulher 62 anos / Homem 65 anos + Carência 15 anos (180 meses)
- Perguntas de triagem: Idade? Quanto tempo contribuiu? Trabalhou de carteira assinada?

📌 APOSENTADORIA POR TEMPO DE CONTRIBUIÇÃO:
- Regra de Transição (para quem já contribuía antes da Reforma)
- Perguntas: Há quanto tempo contribui? Teve períodos sem registro?

📌 APOSENTADORIA ESPECIAL:
- Para trabalhadores expostos a agentes nocivos (ruído, químicos, calor)
- Perguntas: Qual profissão? Usava EPIs? Trabalhava em ambiente insalubre?

📌 APOSENTADORIA RURAL:
- Para trabalhadores rurais, pescadores, agricultores
- Perguntas: Trabalhou na roça? Tem documentos (bloco de notas, sindicato)?

📌 APOSENTADORIA POR INVALIDEZ:
- Para quem não pode mais trabalhar por doença/acidente
- Perguntas: Qual a doença? Está afastado? Recebe auxílio-doença?

📌 AUXÍLIO-DOENÇA:
- Incapacidade temporária para o trabalho
- Perguntas: Está trabalhando? Há quanto tempo está doente? Tem laudos médicos?

📌 AUXÍLIO-ACIDENTE:
- Sequela permanente de acidente que reduz capacidade
- Perguntas: Teve acidente? Ficou com alguma sequela? Voltou a trabalhar?

📌 BPC/LOAS:
- Para idosos 65+ ou deficientes de baixa renda (não precisa ter contribuído)
- Perguntas: Renda familiar? Quantas pessoas moram na casa? Tem deficiência?

📌 PENSÃO POR MORTE:
- Para dependentes de segurado falecido
- Perguntas: O falecido contribuía? Vocês eram casados/união estável? Há filhos menores?

📌 SALÁRIO-MATERNIDADE:
- 120 dias por nascimento, adoção ou aborto não criminoso
- Perguntas: Está grávida ou já teve o bebê? Estava contribuindo?

📌 AUXÍLIO-RECLUSÃO:
- Para dependentes de segurado preso de baixa renda
- Perguntas: Quando foi preso? Estava trabalhando antes? Renda era baixa?

📌 REVISÃO DE BENEFÍCIO:
- Correção de valores ou inclusão de períodos não computados
- Perguntas: Há quanto tempo recebe? Acha que o valor está errado? Teve períodos rurais/especiais?

=== FLUXO DE TRIAGEM ===
1. Identificar o nome do cliente
2. Entender qual benefício busca (ou deixar que descreva a situação)
3. Fazer perguntas específicas sobre os requisitos do benefício
4. Classificar como: VIÁVEL, PRECISA ANÁLISE ou INVIÁVEL
5. Quando tiver info suficiente, indique [TRIAGEM COMPLETA]`);

    useEffect(() => {
        async function load() {
            try {
                const cfg = await api.getConfigs();
                setConfigs(cfg);
                if (cfg.SYSTEM_PROMPT) setPersonalityPrompt(cfg.SYSTEM_PROMPT);

                const tData = await api.getTrelloData();
                setTrelloData(tData);

                try {
                    const docs = await api.getKnowledgeDocuments();
                    setKnowledgeDocs(docs);
                } catch (e) { console.log('No docs yet'); }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        }
        load();
    }, []);

    const handleChange = (key, value) => setConfigs(prev => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.updateConfigs({ ...configs, SYSTEM_PROMPT: personalityPrompt });
            alert('✅ Configurações salvas!');
        } catch (e) { alert('Erro ao salvar'); }
        finally { setSaving(false); }
    };

    // === SIMULATOR FUNCTIONS ===
    const sendSimMessage = async () => {
        if (!simInput.trim() || simLoading) return;

        const msg = simInput.trim();
        setSimInput('');
        setSimMessages(prev => [...prev, { role: 'user', content: msg }]);
        setSimLoading(true);
        setSimDebug(null);

        // Se é a primeira mensagem, mostra saudação inicial (como no WhatsApp real)
        if (simIsFirstMessage) {
            setSimIsFirstMessage(false);
            setTimeout(() => {
                setSimMessages(prev => [...prev, { role: 'assistant', content: INITIAL_GREETING }]);
                setSimLoading(false);
            }, 800);
            return;
        }

        try {
            const history = simMessages.map(m => ({ role: m.role, content: m.content }));
            const result = await api.simulatorChat(msg, history);
            setSimMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
            setSimDebug({ isComplete: result.isComplete, usage: result.usage });
        } catch (err) {
            setSimMessages(prev => [...prev, { role: 'assistant', content: '❌ Erro: ' + err.message }]);
        } finally {
            setSimLoading(false);
        }
    };

    // === KNOWLEDGE FUNCTIONS ===
    const handleUploadPdf = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const result = await api.uploadKnowledgePdf(file, file.name, 'geral');
            setKnowledgeDocs(prev => [result, ...prev]);
        } catch (err) {
            alert('Erro no upload: ' + err.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleCreateText = async () => {
        if (!newTextDoc.title || !newTextDoc.content) {
            alert('Preencha título e conteúdo');
            return;
        }
        try {
            const result = await api.createKnowledgeText(newTextDoc.title, newTextDoc.content, newTextDoc.category);
            setKnowledgeDocs(prev => [result, ...prev]);
            setShowTextModal(false);
            setNewTextDoc({ title: '', content: '', category: 'geral' });
        } catch (err) {
            alert('Erro: ' + err.message);
        }
    };

    const handleEditContent = async (doc) => {
        try {
            const full = await api.getKnowledgeContent(doc.id);
            setEditingDoc(doc);
            setEditContent(full.content || '');
        } catch (err) {
            alert('Erro ao carregar conteúdo');
        }
    };

    const handleSaveContent = async () => {
        if (!editingDoc) return;
        try {
            await api.updateKnowledgeContent(editingDoc.id, editContent);
            setEditingDoc(null);
            setEditContent('');
            // Reload docs
            const docs = await api.getKnowledgeDocuments();
            setKnowledgeDocs(docs);
        } catch (err) {
            alert('Erro ao salvar');
        }
    };

    const handleDeleteDoc = async (id) => {
        if (!confirm('Remover este documento?')) return;
        try {
            await api.deleteKnowledgeDocument(id);
            setKnowledgeDocs(prev => prev.filter(d => d.id !== id));
        } catch (err) {
            alert('Erro ao remover');
        }
    };

    const currentTabInfo = TABS.find(t => t.id === activeTab);

    if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>CARREGANDO...</div>;

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.brand}>ADVOCACIA CAMILA MOURA</div>
            </header>

            {/* Navegação por Abas */}
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

            {/* Área de Conteúdo */}
            <main className={styles.contentArea}>
                <h1 className={styles.sectionTitle}>{currentTabInfo.label}</h1>
                <span className={styles.sectionSubtitle}>{currentTabInfo.subtitle}</span>

                {/* ========== ABA TREINAMENTO ========== */}
                {activeTab === 'training' && (
                    <div className={styles.trainingSection}>
                        {/* Personalidade da Carol */}
                        <div className={styles.personalityBox}>
                            <h3>🎭 Personalidade da Carol</h3>
                            <p className={styles.helpText}>
                                Ajuste o tom de voz e as regras de comportamento da IA.
                            </p>
                            <textarea
                                className={styles.textarea}
                                style={{ minHeight: '200px' }}
                                value={personalityPrompt}
                                onChange={(e) => setPersonalityPrompt(e.target.value)}
                            />
                        </div>

                        {/* Base de Conhecimento */}
                        <div className={styles.knowledgeBox}>
                            <div className={styles.knowledgeHeader}>
                                <h3>📚 Base de Conhecimento ({knowledgeDocs.length} docs)</h3>
                                <div className={styles.knowledgeActions}>
                                    <label className={styles.uploadBtn}>
                                        📄 Upload PDF
                                        <input type="file" accept=".pdf" onChange={handleUploadPdf} hidden />
                                    </label>
                                    <button className={styles.textBtn} onClick={() => setShowTextModal(true)}>
                                        ✏️ Adicionar Texto
                                    </button>
                                </div>
                            </div>

                            {uploading && <p className={styles.uploading}>Enviando PDF...</p>}

                            <div className={styles.docsList}>
                                {knowledgeDocs.map(doc => (
                                    <div key={doc.id} className={styles.docCard}>
                                        <div className={styles.docInfo}>
                                            <strong>{doc.title}</strong>
                                            <small>{doc.fileName} • {doc.category}</small>
                                        </div>
                                        <div className={styles.docActions}>
                                            <button onClick={() => handleEditContent(doc)} title="Editar conteúdo">✏️</button>
                                            <button onClick={() => handleDeleteDoc(doc.id)} title="Remover">🗑️</button>
                                        </div>
                                    </div>
                                ))}
                                {knowledgeDocs.length === 0 && (
                                    <p className={styles.emptyDocs}>Nenhum documento ainda. Suba PDFs ou adicione textos acima.</p>
                                )}
                            </div>
                        </div>

                        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                            {saving ? 'Salvando...' : '💾 Salvar Treinamento'}
                        </button>
                    </div>
                )}

                {/* ========== ABA SIMULADOR ========== */}
                {activeTab === 'simulator' && (
                    <div className={styles.simulatorSection}>
                        <div className={styles.simBanner}>
                            🧪 <strong>Ambiente de Teste</strong> — As mensagens aqui NÃO são enviadas pelo WhatsApp e NÃO criam cards no Trello.
                        </div>

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
                                    onKeyPress={(e) => e.key === 'Enter' && sendSimMessage()}
                                />
                                <button className={styles.sendBtn} disabled={!simInput.trim() || simLoading} onClick={sendSimMessage}>
                                    {simLoading ? '⏳' : '📤'}
                                </button>
                            </div>
                        </div>

                        <div className={styles.simActions}>
                            <button className={styles.resetBtn} onClick={() => { setSimMessages([]); setSimIsFirstMessage(true); setSimDebug(null); }}>
                                🔄 Limpar Conversa
                            </button>
                            {simDebug && (
                                <button className={styles.debugBtn} onClick={() => setShowDebug(!showDebug)}>
                                    {showDebug ? '🔼 Ocultar Debug' : '🔽 Ver Debug IA'}
                                </button>
                            )}
                        </div>

                        {showDebug && simDebug && (
                            <div className={styles.debugBox}>
                                <h4>📊 Debug da IA</h4>
                                <pre>{JSON.stringify(simDebug, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                )}

                {/* ========== ABA CONFIGURAÇÕES ========== */}
                {activeTab === 'settings' && (
                    <div className={styles.settingsSection}>
                        {/* Mensagem Inicial */}
                        <div className={styles.settingsCard}>
                            <h3>👋 Mensagem Inicial (Aviso Ético)</h3>
                            <textarea
                                className={styles.textarea}
                                style={{ minHeight: '120px' }}
                                value={configs.AVISO_ETICO || ''}
                                onChange={(e) => handleChange('AVISO_ETICO', e.target.value)}
                                placeholder="Olá! Você entrou em contato com o escritório da Dra. Camila Moura..."
                            />
                        </div>

                        {/* Trello */}
                        <div className={styles.settingsCard}>
                            <h3>📋 Trello</h3>
                            <div className={styles.inputRow}>
                                <label className={styles.label}>Lista de Entrada</label>
                                <select
                                    className={styles.select}
                                    value={configs.TRELLO_LIST_ID || ''}
                                    onChange={(e) => handleChange('TRELLO_LIST_ID', e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {trelloData.lists?.map(list => (
                                        <option key={list.id} value={list.id}>{list.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.inputRow}>
                                <label className={styles.label}>Etiqueta Urgente</label>
                                <select
                                    className={styles.select}
                                    value={configs.TRELLO_LABEL_URGENTE_ID || ''}
                                    onChange={(e) => handleChange('TRELLO_LABEL_URGENTE_ID', e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {trelloData.labels?.map(label => (
                                        <option key={label.id} value={label.id}>{label.name} ({label.color})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* APIs */}
                        <div className={styles.settingsCard}>
                            <h3>🔑 Chaves de API</h3>
                            <PasswordInput
                                label="OpenAI API Key"
                                value={configs.OPENAI_API_KEY}
                                onChange={(e) => handleChange('OPENAI_API_KEY', e.target.value)}
                            />
                            <div className={styles.inputRow}>
                                <label className={styles.label}>Z-API Instance ID</label>
                                <input
                                    className={styles.input}
                                    value={configs.ZAPI_INSTANCE_ID || ''}
                                    onChange={(e) => handleChange('ZAPI_INSTANCE_ID', e.target.value)}
                                />
                            </div>
                            <PasswordInput
                                label="Z-API Token"
                                value={configs.ZAPI_TOKEN}
                                onChange={(e) => handleChange('ZAPI_TOKEN', e.target.value)}
                            />
                            <PasswordInput
                                label="Z-API Client Token"
                                value={configs.ZAPI_CLIENT_TOKEN}
                                onChange={(e) => handleChange('ZAPI_CLIENT_TOKEN', e.target.value)}
                            />
                            <div className={styles.inputRow}>
                                <label className={styles.label}>Trello Board ID</label>
                                <input
                                    className={styles.input}
                                    value={configs.TRELLO_BOARD_ID || ''}
                                    onChange={(e) => handleChange('TRELLO_BOARD_ID', e.target.value)}
                                />
                            </div>
                            <PasswordInput
                                label="Trello Key"
                                value={configs.TRELLO_KEY}
                                onChange={(e) => handleChange('TRELLO_KEY', e.target.value)}
                            />
                            <PasswordInput
                                label="Trello Token"
                                value={configs.TRELLO_TOKEN}
                                onChange={(e) => handleChange('TRELLO_TOKEN', e.target.value)}
                            />
                        </div>

                        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                            {saving ? 'Salvando...' : '💾 Salvar Configurações'}
                        </button>
                    </div>
                )}
            </main>

            {/* ========== MODAIS ========== */}

            {/* Modal: Adicionar Texto */}
            {showTextModal && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h3>✏️ Adicionar Conhecimento em Texto</h3>
                        <div className={styles.inputRow}>
                            <label className={styles.label}>Título</label>
                            <input
                                className={styles.input}
                                value={newTextDoc.title}
                                onChange={(e) => setNewTextDoc(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Ex: Requisitos Pensão por Morte"
                            />
                        </div>
                        <div className={styles.inputRow}>
                            <label className={styles.label}>Conteúdo</label>
                            <textarea
                                className={styles.textarea}
                                style={{ minHeight: '200px' }}
                                value={newTextDoc.content}
                                onChange={(e) => setNewTextDoc(prev => ({ ...prev, content: e.target.value }))}
                                placeholder="Cole aqui as informações que a Carol deve saber..."
                            />
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.cancelBtn} onClick={() => setShowTextModal(false)}>Cancelar</button>
                            <button className={styles.confirmBtn} onClick={handleCreateText}>Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Editar Conteúdo */}
            {editingDoc && (
                <div className={styles.modal}>
                    <div className={styles.modalContent} style={{ maxWidth: '800px' }}>
                        <h3>✏️ Editar: {editingDoc.title}</h3>
                        <textarea
                            className={styles.textarea}
                            style={{ minHeight: '400px', fontFamily: 'monospace' }}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                        />
                        <div className={styles.modalActions}>
                            <button className={styles.cancelBtn} onClick={() => setEditingDoc(null)}>Cancelar</button>
                            <button className={styles.confirmBtn} onClick={handleSaveContent}>Salvar Alterações</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
