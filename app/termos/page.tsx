"use client"

import Link from "next/link"
import Image from "next/image"
import { 
  FileCheck, 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  UserCheck, 
  ShoppingBag, 
  CreditCard, 
  AlertCircle, 
  ShieldAlert, 
  Lock, 
  MessageCircle, 
  Mail, 
  Phone
} from "lucide-react"

export default function TermosPage() {
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
              Termos &amp; Condições de Uso
            </h1>
            <p className="text-xs font-bold text-[#E3A008] uppercase tracking-wider mt-1.5">
              Batata Top Delivery — Iacanga/SP
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-[#6B635B] font-semibold">
              <span className="inline-flex items-center gap-1.5 bg-[#F7F4EF] px-3 py-1.5 rounded-full border border-[#E8E2D9]">
                <Calendar className="w-3.5 h-3.5 text-[#E3A008]" />
                Última atualização: 16 de outubro de 2026
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#F7F4EF] px-3 py-1.5 rounded-full border border-[#E8E2D9]">
                <MapPin className="w-3.5 h-3.5 text-[#E3A008]" />
                Operação: Iacanga-SP
              </span>
            </div>
          </header>

          {/* Conteúdo dos Termos */}
          <div className="space-y-10 text-sm leading-relaxed text-[#6B635B]">

            {/* 1. Objeto e Aceitação */}
            <section className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#E3A008] border border-[#E8E2D9]">
                  <FileCheck className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  1. Objeto e Aceitação
                </h2>
              </div>
              <p>
                Estes Termos regulam o acesso e uso da plataforma mobile e web <strong>Batata Top</strong> para pedidos de batatas recheadas, refeições e bebidas preparadas sob demanda no município de Iacanga-SP.
              </p>
              <p>
                Ao criar uma conta ou concluir um pedido, você declara ter lido, compreendido e aceito integralmente estes Termos de Uso.
              </p>
            </section>

            {/* 2. Cadastro e Requisitos */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#E3A008] border border-[#E8E2D9]">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  2. Cadastro e Requisitos
                </h2>
              </div>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#E3A008]">
                <li><strong className="text-[#1F1B16]">Idade mínima:</strong> 18 anos completos ou menores devidamente representados por seus responsáveis legais.</li>
                <li><strong className="text-[#1F1B16]">Veracidade dos dados:</strong> O usuário é o único responsável pela veracidade do nome, e-mail, telefone e endereço informados.</li>
                <li><strong className="text-[#1F1B16]">Uso pessoal:</strong> A conta é intransferível. Não compartilhe seu código de autenticação ou credenciais de acesso com terceiros.</li>
              </ul>
            </section>

            {/* 3. Pedidos e Modalidades de Recebimento */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#E3A008] border border-[#E8E2D9]">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  3. Pedidos e Modalidades de Recebimento
                </h2>
              </div>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#E3A008]">
                <li><strong className="text-[#1F1B16]">Delivery:</strong> O entregador levará o pedido até o endereço cadastrado em Iacanga-SP. O cliente deve se atentar ao telefone e acompanhar as notificações de status para receber a refeição.</li>
                <li><strong className="text-[#1F1B16]">Retirada no Balcão:</strong> O cliente retira o pedido diretamente no endereço da loja assim que o status do aplicativo indicar "Pronto para retirada".</li>
                <li><strong className="text-[#1F1B16]">Horários e Disponibilidade:</strong> Pedidos estão sujeitos ao horário de funcionamento da cozinha e à disponibilidade diária de estoque e insumos.</li>
              </ul>
            </section>

            {/* 4. Preços, Cupons e Pagamentos */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#E3A008] border border-[#E8E2D9]">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  4. Preços, Cupons e Pagamentos
                </h2>
              </div>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#E3A008]">
                <li><strong className="text-[#1F1B16]">Valores e taxas:</strong> O valor total do pedido, incluindo adicionais, descontos de cupons e taxa de entrega, é exibido no resumo antes da confirmação.</li>
                <li><strong className="text-[#1F1B16]">Processamento online:</strong> Pagamentos por Cartão de Crédito, Débito e PIX são intermediados com segurança pelo <strong>Mercado Pago</strong>. O Batata Top não armazena dados de cartão em seus servidores.</li>
                <li><strong className="text-[#1F1B16]">Pagamento na entrega:</strong> Quando disponível a opção de pagamento presencial (dinheiro ou maquininha), o valor ou necessidade de troco deve ser especificado no fechamento do pedido.</li>
              </ul>
            </section>

            {/* 5. Cancelamentos e Reembolsos */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-amber-600 border border-[#E8E2D9]">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  5. Cancelamentos e Reembolsos
                </h2>
              </div>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#E3A008]">
                <li><strong className="text-[#1F1B16]">Antes do preparo:</strong> O cancelamento com reembolso integral pode ser solicitado pelo app ou suporte enquanto o pedido ainda não tiver entrado na cozinha.</li>
                <li><strong className="text-[#1F1B16]">Durante o preparo ou entrega:</strong> Por se tratar de alimento perecível feito sob encomenda, não serão aceitos cancelamentos após o início da produção, salvo falha comprovada da loja (atraso excessivo injustificado ou envio incorreto).</li>
                <li><strong className="text-[#1F1B16]">Ausência do cliente:</strong> Caso o entregador aguarde no endereço informado sem sucesso de contato com o cliente, o pedido poderá ser retornado ou descartado sem direito a estorno.</li>
              </ul>
            </section>

            {/* 6. Conduta do Usuário */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-red-600 border border-[#E8E2D9]">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  6. Conduta do Usuário
                </h2>
              </div>
              <p>A Batata Top preza pelo respeito mútuo. É expressamente proibido:</p>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#E3A008]">
                <li>Desrespeitar, ofender ou ameaçar entregadores, atendentes ou funcionários;</li>
                <li>Tentar fraudar sistemas de cupons promocionais ou efetuar pagamentos com cartões clonados/roubados;</li>
                <li>Fornecer intencionalmente endereços ou dados falsos.</li>
              </ul>
              <p className="p-3 rounded-xl bg-red-50 text-red-800 text-xs font-semibold border border-red-100">
                O descumprimento destas regras resultará no cancelamento imediato de pedidos e na suspensão ou exclusão definitiva da conta.
              </p>
            </section>

            {/* 7. Privacidade e Proteção de Dados */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#E3A008] border border-[#E8E2D9]">
                  <Lock className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  7. Privacidade e Proteção de Dados
                </h2>
              </div>
              <p>
                O tratamento dos dados coletados segue estritamente a nossa{" "}
                <Link href="/privacidade" className="font-bold underline text-[#1F1B16] hover:text-[#C1440E]">
                  Declaração de Privacidade
                </Link>{" "}
                e a Lei Geral de Proteção de Dados (LGPD).
              </p>
            </section>

            {/* 8. Atendimento e Suporte */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#E3A008] border border-[#E8E2D9]">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  8. Atendimento e Suporte
                </h2>
              </div>
              <p>Em caso de dúvidas, atrasos ou problemas com o pedido:</p>
              <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E2D9] space-y-2.5 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#E3A008] shrink-0" />
                  <div>
                    <strong className="text-[#1F1B16]">WhatsApp oficial / Suporte no App:</strong>{" "}
                    <a href="https://wa.me/5514997361015" target="_blank" rel="noopener noreferrer" className="font-bold text-[#1F1B16] underline hover:text-[#C1440E]">
                      (14) 99736-1015
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#E3A008] shrink-0" />
                  <div>
                    <strong className="text-[#1F1B16]">E-mail:</strong>{" "}
                    <a href="mailto:enzzobaraldo2008@gmail.com" className="font-bold text-[#1F1B16] underline hover:text-[#C1440E]">
                      enzzobaraldo2008@gmail.com
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#E3A008] shrink-0" />
                  <div>
                    <strong className="text-[#1F1B16]">Localidade:</strong>{" "}
                    <span>Iacanga-SP</span>
                  </div>
                </div>
              </div>
            </section>

          </div>

        </div>
      </main>

      {/* Rodapé */}
      <footer className="text-center text-xs text-[#6B635B] py-6 space-y-2 max-w-3xl mx-auto w-full">
        <div className="flex justify-center items-center gap-4 font-semibold">
          <Link href="/privacidade" className="hover:text-[#1F1B16] transition-colors">
            Política de Privacidade
          </Link>
          <span>•</span>
          <Link href="/termos" className="text-[#1F1B16] font-bold">
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
