import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Database, Key } from "lucide-react"

export default function SetupRequiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-amber-50">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-6 w-6 text-orange-500" />
            <CardTitle className="text-2xl">Configuração do Supabase Necessária</CardTitle>
          </div>
          <CardDescription>
            Para usar este aplicativo, você precisa configurar as credenciais do Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Variáveis de ambiente faltando</AlertTitle>
            <AlertDescription>
              As seguintes variáveis de ambiente precisam ser configuradas para o aplicativo funcionar corretamente.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Key className="h-4 w-4" />
                Passo 1: Obtenha suas credenciais do Supabase
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-6">
                <li>
                  Acesse{" "}
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-500 hover:underline"
                  >
                    supabase.com/dashboard
                  </a>
                </li>
                <li>Selecione ou crie um projeto</li>
                <li>Vá em Settings → API</li>
                <li>Copie a URL do projeto e a chave anon/public</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Key className="h-4 w-4" />
                Passo 2: Configure as variáveis de ambiente
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-6">
                <li>
                  Adicione as variáveis no arquivo <code className="bg-muted px-1 py-0.5 rounded">.env.local</code>{" "}
                  (desenvolvimento) ou em Settings → Environment Variables na Vercel (produção)
                </li>
                <li>Configure as seguintes variáveis:</li>
              </ol>
              <div className="bg-slate-950 text-slate-50 p-4 rounded-lg font-mono text-sm space-y-2 mt-2">
                <div>
                  <div className="text-slate-400">Nome:</div>
                  <div className="text-green-400">NEXT_PUBLIC_SUPABASE_URL</div>
                  <div className="text-slate-400 mt-1">Valor:</div>
                  <div className="text-blue-400">https://seu-projeto.supabase.co</div>
                </div>
                <div className="border-t border-slate-800 pt-2 mt-2">
                  <div className="text-slate-400">Nome:</div>
                  <div className="text-green-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</div>
                  <div className="text-slate-400 mt-1">Valor:</div>
                  <div className="text-blue-400">sua-chave-anon-aqui</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Database className="h-4 w-4" />
                Passo 3: Execute os scripts SQL
              </h3>
              <p className="text-sm text-muted-foreground ml-6">
                Após configurar as variáveis, os scripts SQL na pasta{" "}
                <code className="bg-muted px-1 py-0.5 rounded">scripts/</code> serão executados automaticamente para
                criar as tabelas necessárias.
              </p>
            </div>
          </div>

          <Alert className="bg-orange-50 border-orange-200">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-900">Importante</AlertTitle>
            <AlertDescription className="text-orange-800">
              Após adicionar as variáveis de ambiente, recarregue a página para que as alterações tenham efeito.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
