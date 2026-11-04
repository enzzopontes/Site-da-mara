"use client"

import Link from "next/link"
import Image from "next/image"
import { 
  ArrowLeft, 
  RotateCcw, 
  Calendar, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  HelpCircle, 
  CheckCircle2, 
  Phone, 
  Mail, 
  MapPin 
} from "lucide-react"

export default function ReembolsoPage() {
  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F1B16] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 antialiased selection:bg-[#E3A008] selection:text-white">
      {/* Botão de Retorno */}
      <div className="max-w-3xl w-full mx-auto mb-4">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-bold text-[#4B453F] hover:text-[#1F1B16] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] rounded-lg px-2 py-1"
          aria-label="Voltar para a página inicial"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Voltar para o Início
        </Link>
      </div>

      <main className="w-full max-w-3xl mx-auto my-auto" role="main">
        <div className="bg-white rounded-2xl shadow-lg border border-[#E8E2D9] p-6 sm:p-12 transition-all">
          
          {/* Cabeçalho */}
          <header className="text-center mb-10 pb-8 border-b border-[#E8E2D9]">
            <Link 
              href="/" 
              className="inline-block relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] rounded-full"
              aria-label="Ir para a página inicial da Batata Top"
            >
              <Image
                src="/logo.png"
                alt="Batata Top Delivery"
                fill
                className="object-contain"
                priority
              />
            </Link>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1F1B16] tracking-tight">
              Política de Cancelamento, Troca e Reembolso
            </h1>
            <p className="text-xs font-bold text-[#B45309] uppercase tracking-wider mt-1.5">
              BatataTop Delivery • 66.599.795 QUEILA LAIS MARQUES DA SILVA • CNPJ: 66.599.795/0001-04
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-[#4B453F] font-semibold">
              <span className="inline-flex items-center gap-1.5 bg-[#F7F4EF] px-3 py-1.5 rounded-full border border-[#E8E2D9]">
                <Calendar className="w-3.5 h-3.5 text-[#B45309]" aria-hidden="true" />
                Vigência: Atualizado em 4 de novembro de 2026
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#F7F4EF] px-3 py-1.5 rounded-full border border-[#E8E2D9]">
                <MapPin className="w-3.5 h-3.5 text-[#B45309]" aria-hidden="true" />
                Operação: Iacanga - SP
              </span>
            </div>
          </header>

          {/* Destaque Legal Art. 49 CDC */}
          <section className="mb-10 p-5 rounded-2xl bg-[#FFFBF0] border border-[#FDE68A] text-sm leading-relaxed text-[#1F1B16]">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#B45309] text-white rounded-xl shrink-0 mt-0.5 shadow-sm" aria-hidden="true">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h2 className="font-extrabold text-base text-[#1F1B16]">
                  Direito de Arrependimento e Natureza dos Produtos Alimentícios
                </h2>
                <p className="text-[#4B453F]">
                  Nos termos do <strong>Artigo 49 do Código de Defesa do Consumidor (CDC)</strong>, o consumidor tem o direito de desistir da contratação em até 7 (sete) dias corridos após a contratação ou recebimento de produtos adquiridos fora do estabelecimento comercial físico.
                </p>
                <p className="text-[#4B453F]">
                  Todavia, em razão da <strong>natureza perecível e do preparo imediato e personalizado sob demanda</strong> de refeições quentes, alimentos prontos para consumo e bebidas, o exercício do direito de cancelamento sujeita-se às diretrizes operacionais e legais discriminadas abaixo, resguardando sempre o consumidor contra qualquer vício, avaria ou desconformidade na entrega.
                </p>
              </div>
            </div>
          </section>

          {/* Conteúdo Detalhado */}
          <div className="space-y-10 text-sm leading-relaxed text-[#4B453F]">

            {/* 1. Cancelamento Antes do Início do Preparo */}
            <section className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#B45309] border border-[#E8E2D9]" aria-hidden="true">
                  <Clock className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  1. Cancelamento Antes do Início da Produção
                </h2>
              </div>
              <p>
                Enquanto o pedido estiver no status de <strong>"Aguardando Confirmação"</strong> ou <strong>"Pendente"</strong> e a cozinha da <strong>BatataTop Delivery</strong> ainda não tiver iniciado o preparo ou selecionado insumos perecíveis dedicados, o cancelamento poderá ser solicitado de forma imediata pelo aplicativo ou pelo canal de atendimento, ensejando <strong>estorno integral (100%)</strong> do valor despendido, inclusive taxas de entrega eventualmente pagas.
              </p>
            </section>

            {/* 2. Pedidos em Preparo ou Rota de Entrega */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#C1440E] border border-[#E8E2D9]" aria-hidden="true">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  2. Pedidos em Produção ou em Rota de Entrega
                </h2>
              </div>
              <p>
                Após a confirmação e o ingresso do pedido na fase de <strong>"Em Preparo"</strong> ou <strong>"Saiu para Entrega"</strong>, não será admitido o cancelamento imotivado, considerando o descarte forçado de gênero alimentício perecível produzido exclusivamente para o pedido em questão.
              </p>
              <p>
                <strong>Exceção de Responsabilidade do Estabelecimento:</strong> Caso haja atraso manifestamente excessivo e não justificado imputável unicamente ao estabelecimento (superior ao dobro do tempo estimado comunicado no momento da compra) ou impossibilidade material de atendimento, o consumidor terá direito à desistência com restituição total e imediata dos valores pagos.
              </p>
            </section>

            {/* 3. Vício, Produto Incorreto, Avaria ou Falta de Item */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#27AE60] border border-[#E8E2D9]" aria-hidden="true">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  3. Produtos Avariados, Incorretos ou Não Entregues (Art. 18 do CDC)
                </h2>
              </div>
              <p>
                Garantimos a reposição ou o reembolso nas seguintes hipóteses devidamente comunicadas em até 2 (duas) horas após o recebimento:
              </p>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#B45309]">
                <li>Item divergente do pedido realizado (recheio trocado, item faltante, bebida trocada);</li>
                <li>Embalagem violada ou refeição imprópria para o consumo;</li>
                <li>Não entrega da encomenda no endereço cadastrado por falha logística comprovada do estabelecimento ou entregador credenciado.</li>
              </ul>
              <p>
                Nestes casos, o cliente poderá optar, à sua livre escolha, por: <strong>(i) reenvio imediato do item correto sem custo adicional</strong>; <strong>(ii) cupom de crédito integral para compra futura</strong>; ou <strong>(iii) reembolso financeiro correspondente</strong>.
              </p>
            </section>

            {/* 4. Meios e Prazos de Restituição */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#B45309] border border-[#E8E2D9]" aria-hidden="true">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  4. Formas e Prazos Operacionais de Restituição
                </h2>
              </div>
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E2D9] space-y-2">
                  <p className="font-bold text-[#1F1B16]">Pagamentos via PIX:</p>
                  <p className="text-xs sm:text-sm">
                    Estorno processado diretamente na chave de origem ou conta corrente do pagador intermediado pelo Mercado Pago, efetuado em até 24 (vinte e quatro) horas úteis após a aprovação formal do cancelamento.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E2D9] space-y-2">
                  <p className="font-bold text-[#1F1B16]">Pagamentos via Cartão de Crédito:</p>
                  <p className="text-xs sm:text-sm">
                    A notificação de cancelamento é enviada à adquirente/operadora do cartão em até 48 (quarenta e oito) horas. O crédito efetivo na fatura depende dos prazos da administradora do cartão do cliente, ocorrendo comumente entre 1 (uma) e 2 (duas) faturas subsequentes.
                  </p>
                </div>
              </div>
            </section>

            {/* 5. Como Solicitar */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#B45309] border border-[#E8E2D9]" aria-hidden="true">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  5. Como Acionar o Suporte
                </h2>
              </div>
              <p>
                Para formalizar uma solicitação de cancelamento, troca ou estorno, forneça o número do pedido e relato da ocorrência por meio de nossos canais oficiais:
              </p>
              <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E2D9] space-y-2.5 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#B45309] shrink-0" aria-hidden="true" />
                  <div>
                    <strong className="text-[#1F1B16]">WhatsApp de Suporte ao Cliente:</strong>{" "}
                    <a 
                      href="https://wa.me/5514997361015" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="font-bold text-[#1F1B16] underline hover:text-[#C1440E] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B45309] rounded"
                    >
                      (14) 99736-1015
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#B45309] shrink-0" aria-hidden="true" />
                  <div>
                    <strong className="text-[#1F1B16]">E-mail de Atendimento e DPO:</strong>{" "}
                    <a 
                      href="mailto:maraysis9010@gmail.com" 
                      className="font-bold text-[#1F1B16] underline hover:text-[#C1440E] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B45309] rounded"
                    >
                      maraysis9010@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </section>

          </div>

        </div>
      </main>

      {/* Rodapé e Identificação Legal */}
      <footer className="text-center text-xs text-[#4B453F] py-6 space-y-2 max-w-3xl mx-auto w-full" role="contentinfo">
        <div className="flex justify-center items-center gap-4 font-semibold flex-wrap">
          <Link href="/privacidade" className="hover:text-[#1F1B16] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B45309] rounded px-1">
            Política de Privacidade
          </Link>
          <span aria-hidden="true">•</span>
          <Link href="/termos" className="hover:text-[#1F1B16] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B45309] rounded px-1">
            Termos de Uso
          </Link>
          <span aria-hidden="true">•</span>
          <Link href="/reembolso" className="text-[#1F1B16] font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B45309] rounded px-1">
            Política de Reembolso
          </Link>
          <span aria-hidden="true">•</span>
          <Link href="/excluir-conta" className="hover:text-[#1F1B16] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B45309] rounded px-1">
            Excluir Conta
          </Link>
        </div>
        <p>© {new Date().getFullYear()} 66.599.795 QUEILA LAIS MARQUES DA SILVA • CNPJ: 66.599.795/0001-04 • Rua Carlos Roberto Crepaldi, 120, Sala, Jardim Alvorada, Iacanga - SP, CEP 17187-074</p>
        <p className="text-[11px] text-[#6B635B]">Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
