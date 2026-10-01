import supinoReto from "@/assets/ex/supino-reto.jpg";
import supinoInclinado from "@/assets/ex/supino-inclinado.jpg";
import peckDeck from "@/assets/ex/peck-deck.jpg";
import flexao from "@/assets/ex/flexao.jpg";
import puxada from "@/assets/ex/puxada.jpg";
import remadaCurvada from "@/assets/ex/remada-curvada.jpg";
import remadaBaixa from "@/assets/ex/remada-baixa.jpg";
import barraFixa from "@/assets/ex/barra-fixa.jpg";
import agachamento from "@/assets/ex/agachamento.jpg";
import legPress from "@/assets/ex/leg-press.jpg";
import extensora from "@/assets/ex/extensora.jpg";
import afundo from "@/assets/ex/afundo.jpg";
import terraRomeno from "@/assets/ex/terra-romeno.jpg";
import flexora from "@/assets/ex/flexora.jpg";
import hipThrust from "@/assets/ex/hip-thrust.jpg";
import desenvolvimento from "@/assets/ex/desenvolvimento.jpg";
import elevacaoLateral from "@/assets/ex/elevacao-lateral.jpg";
import facePull from "@/assets/ex/face-pull.jpg";
import roscaDireta from "@/assets/ex/rosca-direta.jpg";
import roscaMartelo from "@/assets/ex/rosca-martelo.jpg";
import tricepsCorda from "@/assets/ex/triceps-corda.jpg";
import tricepsFrances from "@/assets/ex/triceps-frances.jpg";
import prancha from "@/assets/ex/prancha.jpg";
import abdominalPolia from "@/assets/ex/abdominal-polia.jpg";

export type Group = "peito" | "costas" | "quadriceps" | "posterior" | "ombros" | "biceps" | "triceps" | "core";

export const GROUP_LABEL: Record<Group, string> = {
  peito: "Peito",
  costas: "Costas",
  quadriceps: "Quadríceps",
  posterior: "Posterior e glúteos",
  ombros: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  core: "Abdômen",
};

export type Exercise = {
  id: string;
  name: string;
  group: Group;
  equipment: string;
  compound: boolean;
  img: string;
  steps: string[];
  posture: string[];
};

export const EXERCISES: Exercise[] = [
  {
    id: "supino-reto", name: "Supino reto com barra", group: "peito", equipment: "Barra e banco", compound: true, img: supinoReto,
    steps: ["Deite no banco com os olhos abaixo da barra.", "Segure a barra um pouco além da largura dos ombros.", "Desça controlando até tocar o meio do peito.", "Empurre de volta até estender os braços."],
    posture: ["Escápulas juntas e para baixo durante todo o movimento.", "Pés firmes no chão, glúteos no banco.", "Cotovelos a ~45° do corpo, não abertos a 90°.", "Punhos retos, alinhados com o antebraço."],
  },
  {
    id: "supino-inclinado", name: "Supino inclinado com halteres", group: "peito", equipment: "Halteres e banco", compound: true, img: supinoInclinado,
    steps: ["Ajuste o banco entre 30° e 45°.", "Comece com os halteres na altura do peito.", "Empurre para cima aproximando-os no topo.", "Desça devagar até sentir alongar o peito."],
    posture: ["Mantenha o peito aberto e as escápulas encaixadas.", "Não arqueie demais a lombar.", "Controle a descida em 2–3 segundos."],
  },
  {
    id: "peck-deck", name: "Crucifixo na máquina (peck deck)", group: "peito", equipment: "Máquina", compound: false, img: peckDeck,
    steps: ["Ajuste o banco para as alças ficarem na altura do peito.", "Com cotovelos levemente flexionados, junte as alças à frente.", "Segure 1 segundo e volte devagar."],
    posture: ["Costas totalmente apoiadas no encosto.", "Ombros baixos, longe das orelhas.", "Não deixe o peso bater no final."],
  },
  {
    id: "flexao", name: "Flexão de braço", group: "peito", equipment: "Peso corporal", compound: true, img: flexao,
    steps: ["Mãos no chão um pouco além dos ombros.", "Desça o corpo inteiro até o peito quase tocar o chão.", "Empurre de volta à posição inicial."],
    posture: ["Corpo em linha reta da cabeça aos calcanhares.", "Abdômen e glúteos contraídos.", "Se precisar, apoie os joelhos."],
  },
  {
    id: "puxada", name: "Puxada frontal", group: "costas", equipment: "Polia alta", compound: true, img: puxada,
    steps: ["Sente-se e prenda as coxas sob o apoio.", "Segure a barra com pegada aberta.", "Puxe até a parte alta do peito.", "Volte devagar estendendo os braços."],
    posture: ["Peito para cima, leve inclinação para trás.", "Puxe com os cotovelos, não com as mãos.", "Não balance o tronco para ganhar impulso."],
  },
  {
    id: "remada-curvada", name: "Remada curvada com barra", group: "costas", equipment: "Barra", compound: true, img: remadaCurvada,
    steps: ["Incline o tronco à frente (~45°) com joelhos levemente flexionados.", "Puxe a barra em direção ao umbigo.", "Desça controlando."],
    posture: ["Coluna neutra — nunca arredonde as costas.", "Abdômen firme para proteger a lombar.", "Esprema as escápulas no topo."],
  },
  {
    id: "remada-baixa", name: "Remada baixa no cabo", group: "costas", equipment: "Polia baixa", compound: true, img: remadaBaixa,
    steps: ["Sente com os pés apoiados e joelhos levemente flexionados.", "Puxe o triângulo até o abdômen.", "Estenda os braços devagar."],
    posture: ["Tronco ereto, sem jogar o corpo para trás.", "Ombros baixos.", "Junte as escápulas no fim do movimento."],
  },
  {
    id: "barra-fixa", name: "Barra fixa", group: "costas", equipment: "Barra fixa", compound: true, img: barraFixa,
    steps: ["Segure a barra com as palmas para frente.", "Puxe até o queixo passar a barra.", "Desça até estender os braços."],
    posture: ["Comece puxando os ombros para baixo.", "Evite balançar as pernas.", "Use elástico ou máquina assistida se necessário."],
  },
  {
    id: "agachamento", name: "Agachamento livre", group: "quadriceps", equipment: "Barra e rack", compound: true, img: agachamento,
    steps: ["Barra apoiada no trapézio, pés na largura dos ombros.", "Desça empurrando o quadril para trás e para baixo.", "Vá até as coxas ficarem paralelas ao chão.", "Suba empurrando o chão."],
    posture: ["Peito aberto e olhar à frente.", "Joelhos seguem a direção da ponta dos pés.", "Calcanhares sempre no chão.", "Coluna neutra do início ao fim."],
  },
  {
    id: "leg-press", name: "Leg press 45°", group: "quadriceps", equipment: "Máquina", compound: true, img: legPress,
    steps: ["Pés na plataforma na largura dos ombros.", "Destrave e desça até ~90° nos joelhos.", "Empurre sem travar totalmente os joelhos."],
    posture: ["Lombar e glúteos colados no encosto.", "Não deixe o quadril sair do banco ao descer.", "Joelhos alinhados com os pés."],
  },
  {
    id: "extensora", name: "Cadeira extensora", group: "quadriceps", equipment: "Máquina", compound: false, img: extensora,
    steps: ["Ajuste o rolo logo acima dos tornozelos.", "Estenda as pernas completamente.", "Segure 1 segundo e desça devagar."],
    posture: ["Costas apoiadas e mãos nas alças laterais.", "Joelho alinhado ao eixo da máquina.", "Sem chutar o peso."],
  },
  {
    id: "afundo", name: "Afundo com halteres", group: "quadriceps", equipment: "Halteres", compound: true, img: afundo,
    steps: ["Em pé, dê um passo largo à frente.", "Desça até o joelho de trás quase tocar o chão.", "Volte empurrando com a perna da frente."],
    posture: ["Tronco ereto.", "Joelho da frente acima do tornozelo.", "Passo largo o suficiente para formar 90° nas duas pernas."],
  },
  {
    id: "terra-romeno", name: "Levantamento terra romeno", group: "posterior", equipment: "Barra", compound: true, img: terraRomeno,
    steps: ["Em pé segurando a barra na frente das coxas.", "Leve o quadril para trás deslizando a barra pelas pernas.", "Desça até o meio da canela e volte contraindo glúteos."],
    posture: ["Costas retas, nunca arredondadas.", "Joelhos levemente flexionados e fixos.", "Barra sempre colada ao corpo."],
  },
  {
    id: "flexora", name: "Mesa flexora", group: "posterior", equipment: "Máquina", compound: false, img: flexora,
    steps: ["Deite de bruços com o rolo acima dos calcanhares.", "Flexione os joelhos trazendo os calcanhares ao glúteo.", "Desça controlando."],
    posture: ["Quadril colado no banco.", "Não levante o tronco.", "Movimento lento na volta."],
  },
  {
    id: "hip-thrust", name: "Elevação pélvica com barra", group: "posterior", equipment: "Barra e banco", compound: true, img: hipThrust,
    steps: ["Apoie a parte alta das costas no banco, barra sobre o quadril.", "Empurre o quadril para cima até alinhar com o tronco.", "Contraia os glúteos no topo e desça."],
    posture: ["Queixo levemente recolhido.", "Canelas verticais no topo.", "Não hiperestenda a lombar."],
  },
  {
    id: "desenvolvimento", name: "Desenvolvimento com halteres", group: "ombros", equipment: "Halteres e banco", compound: true, img: desenvolvimento,
    steps: ["Sentado, halteres na altura das orelhas.", "Empurre para cima até quase estender os braços.", "Desça até a altura inicial."],
    posture: ["Costas apoiadas no encosto.", "Abdômen firme, sem arquear a lombar.", "Antebraços na vertical."],
  },
  {
    id: "elevacao-lateral", name: "Elevação lateral", group: "ombros", equipment: "Halteres", compound: false, img: elevacaoLateral,
    steps: ["Em pé com halteres ao lado do corpo.", "Eleve os braços pelas laterais até a altura dos ombros.", "Desça devagar."],
    posture: ["Cotovelos levemente flexionados.", "Não suba os ombros em direção às orelhas.", "Sem balançar o tronco."],
  },
  {
    id: "face-pull", name: "Face pull na polia", group: "ombros", equipment: "Polia com corda", compound: false, img: facePull,
    steps: ["Corda na polia na altura do rosto.", "Puxe em direção à testa abrindo as mãos.", "Volte controlando."],
    posture: ["Cotovelos altos, na linha dos ombros.", "Esprema as escápulas.", "Tronco firme e parado."],
  },
  {
    id: "rosca-direta", name: "Rosca direta com barra", group: "biceps", equipment: "Barra", compound: false, img: roscaDireta,
    steps: ["Em pé, segure a barra com as palmas para frente.", "Flexione os cotovelos levando a barra aos ombros.", "Desça devagar até estender."],
    posture: ["Cotovelos colados ao corpo.", "Não jogue o tronco para trás.", "Punhos firmes e retos."],
  },
  {
    id: "rosca-martelo", name: "Rosca martelo", group: "biceps", equipment: "Halteres", compound: false, img: roscaMartelo,
    steps: ["Halteres ao lado do corpo com palmas voltadas uma para a outra.", "Flexione um braço de cada vez (ou os dois).", "Desça controlando."],
    posture: ["Cotovelos fixos ao lado do tronco.", "Ombros relaxados.", "Sem impulso."],
  },
  {
    id: "triceps-corda", name: "Tríceps na polia com corda", group: "triceps", equipment: "Polia com corda", compound: false, img: tricepsCorda,
    steps: ["Segure a corda na polia alta.", "Estenda os cotovelos levando as mãos para baixo.", "Abra a corda no final e volte devagar."],
    posture: ["Cotovelos colados ao corpo e parados.", "Tronco levemente inclinado à frente.", "Só o antebraço se move."],
  },
  {
    id: "triceps-frances", name: "Tríceps francês com halter", group: "triceps", equipment: "Halter e banco", compound: false, img: tricepsFrances,
    steps: ["Sentado, segure um halter com as duas mãos acima da cabeça.", "Desça o halter atrás da cabeça flexionando os cotovelos.", "Estenda os braços de volta."],
    posture: ["Cotovelos apontando para cima, próximos da cabeça.", "Abdômen contraído, sem arquear as costas.", "Movimento lento."],
  },
  {
    id: "prancha", name: "Prancha", group: "core", equipment: "Colchonete", compound: false, img: prancha,
    steps: ["Apoie antebraços e pontas dos pés no chão.", "Mantenha a posição pelo tempo indicado."],
    posture: ["Corpo reto como uma tábua.", "Quadril nem alto nem caído.", "Contraia abdômen e glúteos, respire normalmente."],
  },
  {
    id: "abdominal-polia", name: "Abdominal na polia", group: "core", equipment: "Polia com corda", compound: false, img: abdominalPolia,
    steps: ["Ajoelhe de frente para a polia segurando a corda ao lado da cabeça.", "Enrole a coluna levando os cotovelos aos joelhos.", "Volte devagar."],
    posture: ["O movimento vem do abdômen, não dos braços.", "Quadril parado.", "Expire ao descer."],
  },
];

export const byId = (id: string) => EXERCISES.find((e) => e.id === id)!;
export const alternatives = (id: string) => {
  const ex = byId(id);
  return EXERCISES.filter((e) => e.group === ex.group && e.id !== id);
};
