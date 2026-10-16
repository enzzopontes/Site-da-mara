"use client"

import Link from "next/link"
import Image from "next/image"
import { 
  ShieldCheck, 
  ArrowLeft, 
  Lock, 
  Database, 
  Eye, 
  Share2, 
  FileText, 
  Trash2, 
  Mail, 
  Clock, 
  Calendar,
  ExternalLink
} from "lucide-react"

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F1B16] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 antialiased selection:bg-[#E3A008] selection:text-white">
      {/* Botão de Retorno */}
      <div className="max-w-3xl w-full mx-auto mb-4">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-bold text-[#6B635B] hover:text-[#1F1B16] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o Início
        </Link>
      </div>

      <main className="w-full max-w-3xl mx-auto my-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-[#E8E2D9] p-6 sm:p-12 transition-all">
          
          {/* Cabeçalho */}
          <header className="text-center mb-10 pb-8 border-b border-[#E8E2D9]">
            <Link href="/" className="inline-block relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3">
              <Image
                src="/logo.png"
                alt="Batata Top Delivery"
                fill
                className="object-contain"
                priority
              />
            </Link>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1F1B16] tracking-tight">
              Declaração de Privacidade
            </h1>
            <p className="text-xs font-bold text-[#E3A008] uppercase tracking-wider mt-1.5">
              Batata Top • Iacanga - SP
            </p>
            <p className="text-sm text-[#6B635B] mt-2 font-medium">
              Em estrita conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-[#6B635B] font-semibold">
              <span className="inline-flex items-center gap-1.5 bg-[#F7F4EF] px-3 py-1.5 rounded-full border border-[#E8E2D9]">
                <Calendar className="w-3.5 h-3.5 text-[#E3A008]" />
                Atualizado em 16 de outubro de 2026
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#F7F4EF] px-3 py-1.5 rounded-full border border-[#E8E2D9]">
                <Clock className="w-3.5 h-3.5 text-[#E3A008]" />
                Tempo de leitura: 6 minutos
              </span>
            </div>
          </header>

          {/* Introdução */}
          <section className="mb-10 p-5 rounded-2xl bg-[#FFFBF0] border border-[#FDE68A] text-sm leading-relaxed text-[#1F1B16]">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#E3A008] text-white rounded-xl shrink-0 mt-0.5 shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-[#1F1B16] mb-1">Seus dados são seus.</h2>
                <p className="text-[#6B635B] mb-2 leading-relaxed">
                  A proteção da sua privacidade é prioridade absoluta no <strong>Batata Top</strong>. Assumimos o compromisso de tratar suas informações pessoais com total transparência, segurança e em conformidade com as diretrizes da legislação brasileira.
                </p>
                <p className="text-[#6B635B] leading-relaxed">
                  Esta declaração descreve como coletamos, utilizamos, armazenamos, compartilhamos e protegemos os seus dados durante o uso do nosso aplicativo e plataforma web de delivery em Iacanga-SP.
                </p>
              </div>
            </div>
          </section>

          {/* Conteúdo das Seções */}
          <div className="space-y-10 text-sm leading-relaxed text-[#6B635B]">

            {/* 1. Que dados coletamos? */}
            <section className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#E3A008] border border-[#E8E2D9]">
                  <Database className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-[#1F1B16]">
                  1. Que dados coletamos?
                </h3>
              </div>
              <p>Coletamos apenas as informações necessárias para operar o serviço de delivery e cumprir exigências legais:</p>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#E3A008]">
                <li><strong className="text-[#1F1B16]">Dados cadastrais:</strong> Nome completo, endereço de e-mail e número de telefone celular com DDD (utilizado para confirmação da conta e contato operacional sobre o pedido).</li>
                <li><strong className="text-[#1F1B16]">CPF (opcional):</strong> Coletado somente caso você opte por incluí-lo na emissão do documento fiscal ou para cumprimento de obrigações tributárias.</li>
                <li><strong className="text-[#1F1B16]">Dados de entrega e endereço:</strong> Rua, número, complemento, bairro, cidade (Iacanga-SP) e referências fornecidas para a localização exata do imóvel.</li>
                <li><strong className="text-[#1F1B16]">Localização e GPS (opcional):</strong> Coordenadas obtidas quando você autoriza a permissão no aparelho, utilizadas exclusivamente em primeiro plano para agilizar a seleção do endereço e exibir a estimativa de entrega no mapa.</li>
                <li><strong className="text-[#1F1B16]">Dados de pagamento:</strong> Todas as cobranças online por PIX e cartão de crédito ou débito são processadas de forma criptografada pelo Mercado Pago. O Batata Top não armazena números de cartão, códigos de segurança (CVV) ou senhas bancárias em seus servidores.</li>
                <li><strong className="text-[#1F1B16]">Histórico de pedidos:</strong> Produtos adquiridos, complementos, valores, cupons aplicados, datas e horários das compras.</li>
                <li><strong className="text-[#1F1B16]">Identificadores de dispositivo e acesso:</strong> Versão do aplicativo, modelo do dispositivo, endereço IP, logs de acesso (conforme o Marco Civil da Internet) e token de notificação para entrega de avisos no aparelho.</li>
              </ul>
            </section>

            {/* 2. Para que usamos seus dados? */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#E3A008] border border-[#E8E2D9]">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-[#1F1B16]">
                  2. Para que usamos seus dados?
                </h3>
              </div>
              <p>Utilizamos os dados coletados com fundamentos legais legítimos previstos na LGPD:</p>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#E3A008]">
                <li><strong className="text-[#1F1B16]">Processar e entregar seus pedidos:</strong> Preparar os alimentos encomendados e garantir que o entregador chegue com precisão ao seu endereço em Iacanga-SP.</li>
                <li><strong className="text-[#1F1B16]">Envio de notificações em tempo real:</strong> Manter você informado sobre cada status do pedido (recebido, em preparo, saiu para entrega) por notificações push ou mensagens operacionais.</li>
                <li><strong className="text-[#1F1B16]">Suporte e atendimento:</strong> Solucionar dúvidas, atender solicitações de suporte, cancelamento ou ajustes em pedidos.</li>
                <li><strong className="text-[#1F1B16]">Prevenção à fraude e segurança:</strong> Identificar atividades suspeitas, validar pagamentos e proteger os clientes e a plataforma contra fraudes eletrônicas.</li>
                <li><strong className="text-[#1F1B16]">Cumprimento de obrigações legais:</strong> Emissão de comprovantes fiscais e guarda obrigatória de registros de conexão nos termos da lei.</li>
              </ul>
            </section>

            {/* 3. Compartilhamento de dados */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#E3A008] border border-[#E8E2D9]">
                  <Share2 className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-[#1F1B16]">
                  3. Compartilhamento de dados
                </h3>
              </div>
              <p>O Batata Top <strong>não comercializa, não aluga e não transfere</strong> seus dados pessoais para terceiros com finalidade de propaganda ou mala direta. O compartilhamento ocorre apenas quando essencial:</p>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#E3A008]">
                <li><strong className="text-[#1F1B16]">Entregadores parceiros:</strong> Recebem unicamente o primeiro nome, telefone de contato e endereço de entrega completo para viabilizar a entrega física da sua refeição.</li>
                <li><strong className="text-[#1F1B16]">Intermediador de pagamento (Mercado Pago):</strong> Envio seguro dos dados da transação para autorização e liquidação dos pagamentos em ambiente criptografado e certificado PCI-DSS.</li>
                <li><strong className="text-[#1F1B16]">Provedores de infraestrutura:</strong> Serviços de hospedagem em nuvem de alto padrão de segurança e serviço de notificações (Expo) para entrega técnica de mensagens.</li>
                <li><strong className="text-[#1F1B16]">Autoridades competentes:</strong> Apenas mediante determinação judicial formal ou exigência legal cabível.</li>
              </ul>
            </section>

            {/* 4. Como protegemos e armazenamos seus dados? */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#E3A008] border border-[#E8E2D9]">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-[#1F1B16]">
                  4. Como protegemos e armazenamos seus dados?
                </h3>
              </div>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#E3A008]">
                <li><strong className="text-[#1F1B16]">Criptografia de ponta a ponta:</strong> Todo o tráfego de dados entre o aplicativo/site e os nossos servidores opera sob protocolo HTTPS com criptografia SSL/TLS.</li>
                <li><strong className="text-[#1F1B16]">Acesso controlado:</strong> Somente operadores autorizados e vinculados a termos de confidencialidade têm acesso aos dados operacionais necessários ao atendimento.</li>
                <li><strong className="text-[#1F1B16]">Retenção responsável:</strong> Os dados pessoais são mantidos enquanto sua conta estiver ativa ou pelo período necessário para cumprimento de prazos legais e regulatórios vigentes.</li>
              </ul>
            </section>

            {/* 5. Quais são os seus direitos (LGPD — Art. 18)? */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#E3A008] border border-[#E8E2D9]">
                  <Eye className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-[#1F1B16]">
                  5. Quais são os seus direitos (LGPD — Art. 18)?
                </h3>
              </div>
              <p>A Lei Geral de Proteção de Dados assegura a você os seguintes direitos:</p>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#E3A008]">
                <li><strong className="text-[#1F1B16]">Confirmação e acesso:</strong> Saber se seus dados são tratados e solicitar acesso às informações cadastradas.</li>
                <li><strong className="text-[#1F1B16]">Correção de dados:</strong> Solicitar a correção de dados incompletos, inexatos ou desatualizados diretamente pelo app.</li>
                <li><strong className="text-[#1F1B16]">Revogação de consentimento:</strong> Desativar permissões de localização (GPS) ou notificações a qualquer momento nas configurações do seu aparelho.</li>
                <li><strong className="text-[#1F1B16]">Eliminação dos dados:</strong> Solicitar a exclusão definitiva dos seus dados cadastrais, ressalvadas as informações de guarda legalmente obrigatória.</li>
              </ul>
            </section>

            {/* 6. Como solicitar a exclusão da sua conta e dados? */}
            <section className="space-y-4 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-red-600 border border-[#E8E2D9]">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-[#1F1B16]">
                  6. Como solicitar a exclusão da sua conta e dados?
                </h3>
              </div>
              <p>Você pode solicitar o encerramento da conta e o expurgo dos seus dados pessoais a qualquer momento:</p>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#E3A008]">
                <li><strong className="text-[#1F1B16]">Pelo aplicativo:</strong> Acesse o menu <em>Perfil &gt; Segurança &gt; Excluir Conta</em>.</li>
                <li><strong className="text-[#1F1B16]">Pela página oficial da web:</strong> Acesse nossa central de exclusão pública e registre seu pedido imediatamente.</li>
              </ul>

              <div className="pt-2">
                <Link
                  href="/excluir-conta"
                  className="inline-flex items-center gap-2 py-3 px-5 rounded-xl bg-[#E3A008] hover:bg-[#C1440E] text-white font-bold text-xs sm:text-sm shadow-sm transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Ir para Página de Exclusão de Conta e Dados
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </section>

            {/* 7. Contato do Encarregado de Dados (DPO) e Suporte */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#E3A008] border border-[#E8E2D9]">
                  <Mail className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-[#1F1B16]">
                  7. Contato do Encarregado de Dados (DPO) e Suporte
                </h3>
              </div>
              <p>Para esclarecer dúvidas sobre esta Declaração de Privacidade ou exercer seus direitos de titular de dados:</p>
              <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E2D9] space-y-2 text-xs sm:text-sm">
                <div>
                  <strong className="text-[#1F1B16]">Encarregado pelo tratamento de dados (DPO):</strong>{" "}
                  <span>Equipe de Privacidade e Suporte Batata Top</span>
                </div>
                <div>
                  <strong className="text-[#1F1B16]">E-mail oficial:</strong>{" "}
                  <a href="mailto:suporte@batatatop.com.br" className="text-[#1F1B16] font-bold underline hover:text-[#C1440E]">
                    suporte@batatatop.com.br
                  </a>
                </div>
                <div>
                  <strong className="text-[#1F1B16]">Atendimento local em Iacanga-SP:</strong>{" "}
                  <span>Pelo chat de ajuda no aplicativo ou WhatsApp oficial de suporte da loja.</span>
                </div>
              </div>
            </section>

          </div>

        </div>
      </main>

      {/* Rodapé */}
      <footer className="text-center text-xs text-[#6B635B] py-6 space-y-2 max-w-3xl mx-auto w-full">
        <div className="flex justify-center items-center gap-4 font-semibold">
          <Link href="/privacidade" className="text-[#1F1B16] font-bold">
            Política de Privacidade
          </Link>
          <span>•</span>
          <Link href="/termos" className="hover:text-[#1F1B16] transition-colors">
            Termos de Uso
          </Link>
          <span>•</span>
          <Link href="/excluir-conta" className="hover:text-[#1F1B16] transition-colors">
            Excluir Conta
          </Link>
        </div>
        <p>© {new Date().getFullYear()} Batata Top • Delivery de Batata Recheada • Iacanga - SP.</p>
        <p className="text-[10px] text-gray-400">Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
