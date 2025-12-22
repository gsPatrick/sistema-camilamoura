import './globals.css';

export const metadata = {
    title: 'Advocacia Camila Moura | CRM Bot',
    description: 'Painel de Gestão Inteligente',
};

export default function RootLayout({ children }) {
    return (
        <html lang="pt-BR">
            <body>{children}</body>
        </html>
    );
}
