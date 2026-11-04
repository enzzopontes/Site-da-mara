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
  ExternalLink,
  Download,
  Globe2,
  CheckCircle2
} from "lucide-react"

export default function PrivacidadePage() {
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
              Política de Privacidade e Proteção de Dados Pessoais
            </h1>
            <p className="text-xs font-bold text-[#B45309] uppercase tracking-wider mt-1.5">
              BatataTop Delivery • 66.599.795 QUEILA LAIS MARQUES DA SILVA • CNPJ: 66.599.795/0001-04
            </p>
            <p className="text-sm text-[#4B453F] mt-2 font-medium">
              Elaborada em estrita conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei Federal nº 13.709/2018) e o Marco Civil da Internet (Lei Federal nº 12.965/2014)
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-[#4B453F] font-semibold">
              <span className="inline-flex items-center gap-1.5 bg-[#F7F4EF] px-3 py-1.5 rounded-full border border-[#E8E2D9]">
                <Calendar className="w-3.5 h-3.5 text-[#B45309]" aria-hidden="true" />
                Vigência: Atualizado em 4 de novembro de 2026
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#F7F4EF] px-3 py-1.5 rounded-full border border-[#E8E2D9]">
                <Clock className="w-3.5 h-3.5 text-[#B45309]" aria-hidden="true" />
                Tempo estimado de leitura: 7 minutos
              </span>
            </div>
          </header>

          {/* Destaque Institucional */}
          <section className="mb-10 p-5 rounded-2xl bg-[#FFFBF0] border border-[#FDE68A] text-sm leading-relaxed text-[#1F1B16]">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#B45309] text-white rounded-xl shrink-0 mt-0.5 shadow-sm" aria-hidden="true">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-[#1F1B16] mb-1">Compromisso com a sua Privacidade</h2>
                <p className="text-[#4B453F] mb-2 leading-relaxed">
                  Para o <strong>BatataTop Delivery</strong>, operado sob o nome empresarial <strong>66.599.795 QUEILA LAIS MARQUES DA SILVA</strong> (CNPJ <strong>66.599.795/0001-04</strong>), com sede na <strong>Rua Carlos Roberto Crepaldi, 120, Sala, Jardim Alvorada, Iacanga - SP, CEP 17187-074</strong> e domínio <strong>batatatopiacanga.com.br</strong>, a privacidade, a segurança da informação e a autodeterminação informativa de nossos clientes são princípios intransigíveis.
                </p>
                <p className="text-[#4B453F] leading-relaxed">
                  Este documento esclarece quais dados pessoais coletamos, as bases legais que legitimam o tratamento, com quem compartilhamos, os prazos de guarda e como você pode exercer livremente seus direitos de titular.
                </p>
              </div>
            </div>
          </section>

          {/* Seções de Conteúdo */}
          <div className="space-y-10 text-sm leading-relaxed text-[#4B453F]">

            {/* 1. Bases Legais e Finalidades (Art. 7º e 9º LGPD) */}
            <section className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#B45309] border border-[#E8E2D9]" aria-hidden="true">
                  <Database className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  1. Dados Coletados, Finalidades e Bases Legais (Art. 7º da LGPD)
                </h2>
              </div>
              <p>
                Coletamos unicamente os dados necessários à viabilização do serviço de delivery gastronômico e obrigações legais, conforme a tabela descritiva:
              </p>

              <div className="overflow-x-auto border border-[#E8E2D9] rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F7F4EF] text-[#1F1B16] font-bold border-b border-[#E8E2D9]">
                      <th className="p-3">Categoria de Dados</th>
                      <th className="p-3">Finalidade Específica</th>
                      <th className="p-3">Base Legal (Art. 7º LGPD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E2D9]">
                    <tr>
                      <td className="p-3 font-semibold text-[#1F1B16]">Identificação e Contato (Nome, E-mail, Celular/WhatsApp)</td>
                      <td className="p-3">Criação da conta de acesso, autenticação segura e comunicação direta sobre o andamento e entrega do pedido.</td>
                      <td className="p-3">Execução de Contrato (Art. 7º, V)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[#1F1B16]">Endereço de Entrega (Logradouro, número, bairro, complemento, referência)</td>
                      <td className="p-3">Deslocamento logístico do entregador parceiro até o local exato do destinatário em Iacanga-SP.</td>
                      <td className="p-3">Execução de Contrato (Art. 7º, V)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[#1F1B16]">Transação Financeira e Pagamento (PIX, Cartão)</td>
                      <td className="p-3">Processamento do pagamento criptografado via Mercado Pago. Não armazenamos números ou códigos CVV em nossos servidores.</td>
                      <td className="p-3">Execução de Contrato (Art. 7º, V) e Prevenção à Fraude (Art. 11, II, g)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[#1F1B16]">Registros de Conexão e Acesso (IP, data, hora, porta)</td>
                      <td className="p-3">Guarda obrigatória de registros de aplicação na internet por 6 meses.</td>
                      <td className="p-3">Cumprimento de Obrigação Legal (Art. 7º, II c/c Art. 15 Marco Civil)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[#1F1B16]">Cookies de Métricas e Desempenho (Opt-in)</td>
                      <td className="p-3">Mensuração anônima de acessos e usabilidade do site/aplicativo para melhorias técnicas contínuas.</td>
                      <td className="p-3">Consentimento (Art. 7º, I) / Legítimo Interesse (Art. 7º, IX)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 2. Prazos de Retenção e Descarte */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#B45309] border border-[#E8E2D9]" aria-hidden="true">
                  <Clock className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  2. Prazos de Armazenamento e Retenção
                </h2>
              </div>
              <p>Os dados pessoais são guardados somente pelos períodos estritamente necessários:</p>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#B45309]">
                <li><strong className="text-[#1F1B16]">Dados de Perfil e Cadastro:</strong> Conservados durante o vínculo ativo do usuário com o serviço ou até a solicitação formal de exclusão do titular.</li>
                <li><strong className="text-[#1F1B16]">Histórico de Pedidos e Notas Fiscais:</strong> Mantidos pelo prazo de 5 (cinco) anos para cumprimento de obrigações tributárias e fiscais (Artigo 173 do Código Tributário Nacional) e defesa em juízo (Código Civil).</li>
                <li><strong className="text-[#1F1B16]">Logs de Conexão de Aplicação:</strong> Armazenados pelo prazo legal de 6 (seis) meses sob sigilo e ambiente controlado, conforme determinação expressa do Art. 15 da Lei nº 12.965/2014 (Marco Civil da Internet).</li>
              </ul>
            </section>

            {/* 3. Compartilhamento de Dados com Terceiros e Operadores */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#B45309] border border-[#E8E2D9]" aria-hidden="true">
                  <Share2 className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  3. Compartilhamento e Transferência Internacional
                </h2>
              </div>
              <p>
                <strong>Não comercializamos, não alugamos e não vendemos dados pessoais sob nenhuma circunstância.</strong> O compartilhamento restringe-se estritamente às atividades operacionais indispensáveis:
              </p>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#B45309]">
                <li><strong className="text-[#1F1B16]">Entregadores Locais:</strong> Acesso restrito ao primeiro nome, telefone operacional e endereço físico para a realização exclusiva da entrega.</li>
                <li><strong className="text-[#1F1B16]">Processador de Pagamentos (Mercado Pago):</strong> Ambiente seguro e certificado internacionalmente com o padrão PCI-DSS para autorização e antifraude de transações.</li>
                <li><strong className="text-[#1F1B16]">Infraestrutura de Nuvem e Banco de Dados (Supabase / Vercel):</strong> Hospedagem em servidores com criptografia em repouso e em trânsito (TLS 1.3), com cláusulas contratuais padrão de segurança alinhadas à LGPD e GDPR.</li>
                <li><strong className="text-[#1F1B16]">Autoridades Públicas e Judiciais:</strong> Somente quando formalmente requisitado por ordem judicial ou determinação legal expressa.</li>
              </ul>
            </section>

            {/* 4. Direitos do Titular de Dados (Art. 18 LGPD) */}
            <section className="space-y-4 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#B45309] border border-[#E8E2D9]" aria-hidden="true">
                  <Eye className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  4. Seus Direitos como Titular (Artigo 18 da LGPD)
                </h2>
              </div>
              <p>A qualquer momento e sem custos, você pode exercer os direitos previstos na legislação:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E8E2D9]">
                  <strong className="text-[#1F1B16] block mb-1">Confirmação e Acesso:</strong>
                  Saber se tratamos seus dados e solicitar cópia integral dos seus registros.
                </div>
                <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E8E2D9]">
                  <strong className="text-[#1F1B16] block mb-1">Correção:</strong>
                  Corrigir dados incompletos, inexatos ou desatualizados diretamente na tela "Meus Dados".
                </div>
                <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E8E2D9]">
                  <strong className="text-[#1F1B16] block mb-1">Portabilidade de Dados:</strong>
                  Baixar seus dados pessoais em formato aberto e estruturado (JSON).
                </div>
                <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E8E2D9]">
                  <strong className="text-[#1F1B16] block mb-1">Eliminação e Revogação:</strong>
                  Requerer a exclusão dos dados tratados sob consentimento e revogar autorizações prévias.
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/excluir-conta"
                  className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Solicitar Exclusão de Conta e Dados
                </Link>
                <Link
                  href="/meus-dados"
                  className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-[#F7F4EF] hover:bg-[#E8E2D9] text-[#1F1B16] font-bold text-xs border border-[#E8E2D9] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309]"
                >
                  <Download className="w-3.5 h-3.5 text-[#B45309]" aria-hidden="true" />
                  Acessar e Exportar Meus Dados
                </Link>
              </div>
            </section>

            {/* 5. Segurança da Informação */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#B45309] border border-[#E8E2D9]" aria-hidden="true">
                  <Lock className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  5. Medidas Técnicas e Segurança da Informação
                </h2>
              </div>
              <p>Adotamos medidas protetivas alinhadas às boas práticas de segurança cibernética:</p>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#B45309]">
                <li>Comunicação 100% criptografada sob o protocolo HTTPS / TLS 1.3;</li>
                <li>Controle de acesso fundamentado no princípio do menor privilégio (least privilege);</li>
                <li>Isolamento de banco de dados com autenticação baseada em JWT seguro e Row Level Security (RLS) no Supabase.</li>
              </ul>
            </section>

            {/* 6. Canal do Encarregado de Dados (DPO) e Prazos de Resposta */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#B45309] border border-[#E8E2D9]" aria-hidden="true">
                  <Mail className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  6. Encarregado pelo Tratamento de Dados Pessoais (DPO)
                </h2>
              </div>
              <p>
                Em observância ao Artigo 41 da LGPD, disponibilizamos canal de contato direto e exclusivo com o Encarregado de Dados (DPO) para receber comunicações, requisições dos titulares e prestar esclarecimentos à Autoridade Nacional de Proteção de Dados (ANPD):
              </p>
              <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E2D9] space-y-2 text-xs sm:text-sm">
                <div>
                  <strong className="text-[#1F1B16]">Encarregada pelo Tratamento de Dados (DPO):</strong>{" "}
                  <span>Maraysis Pontes Baraldo</span>
                </div>
                <div>
                  <strong className="text-[#1F1B16]">E-mail oficial da DPO:</strong>{" "}
                  <a 
                    href="mailto:maraysis9010@gmail.com" 
                    className="text-[#1F1B16] font-bold underline hover:text-[#C1440E] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B45309] rounded"
                  >
                    maraysis9010@gmail.com
                  </a>
                </div>
                <div>
                  <strong className="text-[#1F1B16]">Prazo de atendimento:</strong>{" "}
                  <span>As requisições serão respondidas imediatamente de forma simplificada ou em até 15 (quinze) dias úteis para declarações claras e completas (Art. 19, II da LGPD).</span>
                </div>
                <div>
                  <strong className="text-[#1F1B16]">Endereço da sede:</strong>{" "}
                  <span>Rua Carlos Roberto Crepaldi, 120, Sala, Jardim Alvorada, Iacanga - SP, CEP 17187-074</span>
                </div>
              </div>
            </section>

          </div>

        </div>
      </main>

      {/* Rodapé e Identificação da Empresa */}
      <footer className="text-center text-xs text-[#4B453F] py-6 space-y-2 max-w-3xl mx-auto w-full" role="contentinfo">
        <div className="flex justify-center items-center gap-4 font-semibold flex-wrap">
          <Link href="/privacidade" className="text-[#1F1B16] font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B45309] rounded px-1">
            Política de Privacidade
          </Link>
          <span aria-hidden="true">•</span>
          <Link href="/termos" className="hover:text-[#1F1B16] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B45309] rounded px-1">
            Termos de Uso
          </Link>
          <span aria-hidden="true">•</span>
          <Link href="/reembolso" className="hover:text-[#1F1B16] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B45309] rounded px-1">
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
