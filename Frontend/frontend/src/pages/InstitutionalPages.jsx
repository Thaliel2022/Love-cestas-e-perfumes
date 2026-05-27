import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ChevronDownIcon,
    CurrencyDollarIcon,
    InstagramIcon,
    TruckIcon,
    UserIcon,
    WhatsappIcon
} from '../components/icons';

export const AjudaPage = ({ onNavigate }) => {
    const faqData = [
        {
            q: "Como posso rastrear meu pedido?",
            a: <>Para rastrear seu pedido, acesse a seção <a href="#account/orders" onClick={(e) => { e.preventDefault(); onNavigate('account/orders'); }} className="text-amber-400 underline hover:text-amber-300">"Meus Pedidos"</a> em sua conta, localize o pedido desejado e clique em "Ver Detalhes". Se houver um código de rastreio, ele estará disponível lá, junto com um botão para rastreá-lo.</>
        },
        {
            q: "Quais são as formas de pagamento aceitas?",
            a: <>Aceitamos pagamentos via Pix, Boleto Bancário e Cartão de Crédito. Todos os pagamentos são processados de forma segura através do Mercado Pago. Você pode parcelar suas compras no cartão de crédito, e as opções de parcelamento serão exibidas na página de finalização da compra.</>
        },
        {
            q: "Qual é o prazo de entrega?",
            a: <>O prazo de entrega varia de acordo com o seu CEP e a modalidade de envio escolhida (PAC ou Sedex). Você pode calcular o prazo estimado na página do produto ou no carrinho de compras antes de finalizar o pedido. Para João Pessoa, PB, também oferecemos a opção de retirada na loja.</>
        },
        {
            q: "Como funciona a política de troca e devolução?",
            a: <>Você pode solicitar a troca ou devolução de um produto em até 7 dias corridos após o recebimento. O produto não deve apresentar sinais de uso e deve estar em sua embalagem original. Para iniciar o processo, acesse a página de detalhes do seu pedido em <a href="#account/orders" onClick={(e) => { e.preventDefault(); onNavigate('account/orders'); }} className="text-amber-400 underline hover:text-amber-300">"Meus Pedidos"</a> e utilize a opção de solicitar cancelamento/reembolso, informando o motivo.</>
        },
    ];

    const AccordionItem = ({ question, answer }) => {
        const [isOpen, setIsOpen] = useState(false);
        return (
            <div className="border-b border-gray-800">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex justify-between items-center text-left py-4 px-2"
                >
                    <span className="font-semibold text-lg text-white">{question}</span>
                    <ChevronDownIcon className={`h-6 w-6 text-amber-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <div className="pb-4 px-2 text-gray-400">{answer}</div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div className="bg-black text-white min-h-screen py-12">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-amber-400">Central de Ajuda</h1>
                    <p className="text-lg text-gray-400">Como podemos ajudar você hoje?</p>
                </div>

                <div className="mb-16">
                    <h2 className="text-2xl font-bold text-center mb-8">Ações Rápidas</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div onClick={() => onNavigate('account/orders')} className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-center cursor-pointer hover:border-amber-400 hover:bg-gray-800 transition-all">
                            <TruckIcon className="h-10 w-10 mx-auto text-amber-400 mb-3" />
                            <h3 className="font-semibold text-xl">Rastrear Pedido</h3>
                            <p className="text-sm text-gray-500 mt-1">Acompanhe o status da sua entrega.</p>
                        </div>
                        <div onClick={() => onNavigate('account')} className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-center cursor-pointer hover:border-amber-400 hover:bg-gray-800 transition-all">
                            <UserIcon className="h-10 w-10 mx-auto text-amber-400 mb-3" />
                            <h3 className="font-semibold text-xl">Minha Conta</h3>
                            <p className="text-sm text-gray-500 mt-1">Veja seus pedidos e dados cadastrais.</p>
                        </div>
                        <div onClick={() => onNavigate('checkout')} className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-center cursor-pointer hover:border-amber-400 hover:bg-gray-800 transition-all">
                            <CurrencyDollarIcon className="h-10 w-10 mx-auto text-amber-400 mb-3" />
                            <h3 className="font-semibold text-xl">Pagamentos</h3>
                            <p className="text-sm text-gray-500 mt-1">Conheça nossas formas de pagamento.</p>
                        </div>
                    </div>
                </div>

                <div className="mb-16">
                    <h2 className="text-2xl font-bold text-center mb-8">Perguntas Frequentes</h2>
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                        {faqData.map((faq, index) => (
                            <AccordionItem key={index} question={faq.q} answer={faq.a} />
                        ))}
                    </div>
                </div>

                <div className="text-center bg-gray-900 p-8 rounded-lg border border-gray-800">
                    <h2 className="text-2xl font-bold mb-2">Ainda precisa de ajuda?</h2>
                    <p className="text-gray-400 mb-6">Nossa equipe está pronta para te atender em nossos canais oficiais.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                         <a href="https://wa.me/5583987379573" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 bg-green-500 text-white font-bold p-4 rounded-lg hover:bg-green-600 transition-colors w-full sm:w-auto">
                            <WhatsappIcon className="h-6 w-6" />
                            <span>Contatar via WhatsApp</span>
                        </a>
                        <a href="https://www.instagram.com/lovecestaseperfumesjp/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 bg-pink-500 text-white font-bold p-4 rounded-lg hover:bg-pink-600 transition-colors w-full sm:w-auto">
                            <InstagramIcon className="h-6 w-6" />
                            <span>Mensagem no Instagram</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const AboutPage = ({ appName }) => {
    return (
        <div className="bg-black text-white min-h-screen py-16">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-amber-400">Sobre Nós</h1>
                    <p className="text-lg text-gray-400">Elegância que Veste e Perfuma</p>
                </div>

                <div className="bg-gray-900 p-8 rounded-lg border border-gray-800 space-y-8 text-lg text-gray-300 leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Nossa História</h2>
                        <p>A {appName || 'loja'} nasceu de uma paixão por aromas marcantes e pela moda que expressa identidade. Fundada em João Pessoa, Paraíba, nossa missão sempre foi oferecer mais do que produtos; oferecemos uma experiência de autoestima e bem-estar. Cada peça de roupa é selecionada com um olhar atento às tendências e à qualidade, e cada perfume é escolhido por sua capacidade de criar memórias inesquecíveis.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Nossa Missão</h2>
                        <p>Nossa missão é simples: realçar a beleza e a confiança de cada cliente. Acreditamos que a combinação de uma fragrância envolvente e um look que reflete sua personalidade tem o poder de transformar o dia a dia. Trabalhamos para ser sua primeira escolha quando o assunto é se sentir bem, seja para uma ocasião especial ou para o conforto do cotidiano.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Nossos Valores</h2>
                        <ul className="list-disc list-inside space-y-2">
                            <li><span className="font-semibold text-amber-400">Qualidade:</span> Comprometimento com produtos de alta durabilidade e procedência.</li>
                            <li><span className="font-semibold text-amber-400">Atendimento:</span> Uma experiência de compra próxima e atenciosa, do primeiro clique à entrega.</li>
                            <li><span className="font-semibold text-amber-400">Confiança:</span> Transparência em todos os processos para construir um relacionamento sólido com você.</li>
                            <li><span className="font-semibold text-amber-400">Paixão:</span> Amor em cada detalhe, desde a seleção dos produtos até a embalagem que chega em sua casa.</li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
};

export const PrivacyPolicyPage = ({ appName, appLogoText }) => {
    const displayLogo = appLogoText || appName || 'nossa loja';
    return (
        <div className="bg-black text-white min-h-screen py-16">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-amber-400">Política de Privacidade</h1>
                    <p className="text-gray-400">Última atualização: 16 de Outubro de 2025</p>
                </div>
                <div className="bg-gray-900 p-8 rounded-lg border border-gray-800 space-y-6 text-gray-300 leading-relaxed">
                    <p>Sua privacidade é importante para nós. É política da {displayLogo} respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar em nosso site.</p>
                    
                    <h3 className="text-xl font-bold text-white pt-4">1. Coleta de Dados</h3>
                    <p>Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. Também informamos por que estamos coletando e como será usado.</p>

                    <h3 className="text-xl font-bold text-white pt-4">2. Uso de Dados</h3>
                    <p>Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados, protegemos dentro de meios comercialmente aceitáveis para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.</p>

                    <h3 className="text-xl font-bold text-white pt-4">3. Cookies</h3>
                    <p>Nosso site utiliza cookies para melhorar a sua experiência de navegação. Cookies são pequenos arquivos que são armazenados no seu computador para coletar informações como suas preferências e itens no carrinho. Você pode desativar os cookies nas configurações do seu navegador, mas isso pode afetar a funcionalidade do site.</p>

                    <h3 className="text-xl font-bold text-white pt-4">4. Seus Direitos (LGPD)</h3>
                    <p>Você tem o direito de acessar, corrigir ou excluir suas informações pessoais a qualquer momento. Você pode gerenciar seus dados na seção "Minha Conta" ou entrando em contato conosco. Estamos em conformidade com a Lei Geral de Proteção de Dados (LGPD).</p>

                    <h3 className="text-xl font-bold text-white pt-4">5. Links para Sites de Terceiros</h3>
                    <p>O nosso site pode ter links para sites externos que não são operados por nós. Esteja ciente de que não temos controle sobre o conteúdo e práticas desses sites e não podemos aceitar responsabilidade por suas respectivas políticas de privacidade.</p>
                    
                    <h3 className="text-xl font-bold text-white pt-4">6. Contato</h3>
                    <p>Se você tiver alguma dúvida sobre como lidamos com dados do usuário e informações pessoais, entre em contato conosco através dos nossos canais de atendimento na Central de Ajuda.</p>
                </div>
            </div>
        </div>
    );
};

export const TermsOfServicePage = ({ appName, appLogoText }) => {
    const displayLogo = appLogoText || appName || 'nossa loja';
    return (
        <div className="bg-black text-white min-h-screen py-16">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-amber-400">Termos de Serviço</h1>
                    <p className="text-gray-400">Última atualização: 16 de Outubro de 2025</p>
                </div>
                <div className="bg-gray-900 p-8 rounded-lg border border-gray-800 space-y-6 text-gray-300 leading-relaxed">
                    <h3 className="text-xl font-bold text-white">1. Aceitação dos Termos</h3>
                    <p>Ao acessar e usar o site da {displayLogo}, você concorda em cumprir estes Termos de Serviço e todas as leis e regulamentos aplicáveis. Se você não concorda com algum destes termos, está proibido de usar ou acessar este site.</p>

                    <h3 className="text-xl font-bold text-white pt-4">2. Contas de Usuário</h3>
                    <p>Para acessar certas funcionalidades, você pode ser solicitado a criar uma conta. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorrem em sua conta. Você concorda em nos notificar imediatamente sobre qualquer uso não autorizado de sua conta.</p>

                    <h3 className="text-xl font-bold text-white pt-4">3. Produtos e Preços</h3>
                    <p>Fazemos o nosso melhor para exibir com precisão as cores e imagens dos nossos produtos. Não podemos garantir que a exibição de qualquer cor no monitor do seu computador seja precisa. Os preços dos nossos produtos estão sujeitos a alterações sem aviso prévio. Reservamo-nos o direito de, a qualquer momento, modificar ou descontinuar um produto sem aviso prévio.</p>
                    
                    <h3 className="text-xl font-bold text-white pt-4">4. Pedidos e Pagamentos</h3>
                    <p>Reservamo-nos o direito de recusar qualquer pedido que você fizer conosco. Podemos, a nosso critério, limitar ou cancelar as quantidades compradas por pessoa, por domicílio ou por pedido. No caso de fazermos uma alteração ou cancelarmos um pedido, podemos tentar notificá-lo entrando em contato com o e-mail e/ou endereço de faturamento/número de telefone fornecido no momento em que o pedido foi feito.</p>

                    <h3 className="text-xl font-bold text-white pt-4">5. Limitação de Responsabilidade</h3>
                    <p>Em nenhuma circunstância a {displayLogo} será responsável por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro, ou devido a interrupção dos negócios) decorrentes do uso ou da incapacidade de usar os materiais no site da {displayLogo}.</p>
                </div>
            </div>
        </div>
    );
};
