export const CATEGORIES = [
  { id: 'knowledge', label: 'Conhecimento da IA', color: 'text-sky-400', dot: 'bg-sky-400' },
  { id: 'actions', label: 'O que a IA pode fazer', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  { id: 'instructions', label: 'Instruções & Resposta', color: 'text-amber-400', dot: 'bg-amber-400' },
  { id: 'files', label: 'Arquivos Anexados', color: 'text-purple-400', dot: 'bg-purple-400' },
];

export const INITIAL_DEMO_WORKSPACES = [
  {
    id: 'ws-clinica-exemplo',
    name: 'Clínica Movimento & Saúde',
    slug: 'clinica-movimento',
    embed_token: 'demo-token-123',
  },
];

export const INITIAL_DEMO_BLOCKS = [
  {
    id: 'blk-1',
    workspace_id: 'ws-clinica-exemplo',
    category: 'instructions',
    title: 'Fundamento e Regras do Agente',
    sort_order: 1,
    is_active: true,
    is_locked_for_client: true,
    client_can_edit: false,
    client_can_delete: false,
    content_md: `# Identidade da Secretária IA
Você é a **Ana**, assistente virtual oficial da {{empresa_nome}}.
Responda sempre com empatia, frases curtas e foco em conversão.

[[OCULTO]]
REGRA INTERNA DE ENGENHARIA DE PROMPT:
- Nunca diga que é uma IA genérica.
- Se o cliente demonstrar objeção de preço, ofereça primeiro a aula experimental gratuita antes de encerrar.
- Sempre valide o horário disponível usando a tool de agendamento antes de confirmar.
[[/OCULTO]]`,
  },
  {
    id: 'blk-2',
    workspace_id: 'ws-clinica-exemplo',
    category: 'knowledge',
    title: 'Informações da Empresa & Endereço',
    sort_order: 2,
    is_active: true,
    is_locked_for_client: false,
    client_can_edit: true,
    client_can_delete: false,
    content_md: `# Dados Gerais
- **Endereço:** Rua das Flores, 450 - Centro
- **Horário de Funcionamento:** Segunda a Sexta, das 07h às 21h | Sábado, das 08h às 13h
- **Estacionamento:** Convênio gratuito por 2 horas no local.`,
  },
  {
    id: 'blk-3',
    workspace_id: 'ws-clinica-exemplo',
    category: 'knowledge',
    title: 'Serviços & Preços (Pilates, Dança, Jiu-Jitsu)',
    sort_order: 3,
    is_active: true,
    is_locked_for_client: false,
    client_can_edit: true,
    client_can_delete: true,
    content_md: `# Tabela de Serviços
- **Pilates:** R$ 280/mês (2x na semana) | Aula experimental gratuita.
- **Dança:** R$ 190/mês (Ritmos e Contemporânea).
- **Jiu-Jitsu:** R$ 210/mês (Turmas iniciantes e avançadas).

[[OCULTO]]
INSTRUÇÃO INTERNA: Mesmo que o cliente pergunte só sobre Pilates, se mencionar interesse em outras modalidades, apresente Dança e Jiu-Jitsu normalmente.
[[/OCULTO]]`,
  },
  {
    id: 'blk-4',
    workspace_id: 'ws-clinica-exemplo',
    category: 'actions',
    title: 'Agendamentos e Coleta de Dados',
    sort_order: 4,
    is_active: true,
    is_locked_for_client: false,
    client_can_edit: true,
    client_can_delete: false,
    content_md: `# O que você deve fazer ao agendar
1. Pedir **Nome completo** e **WhatsApp**.
2. Perguntar qual **modalidade** e **melhor turno** (manhã, tarde ou noite).
3. Chamar a ferramenta de agendamento e confirmar o horário.`,
  },
];
