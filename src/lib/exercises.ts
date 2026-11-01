import supinoReto from "@/assets/ex/supino-reto.webp";
import supinoInclinado from "@/assets/ex/supino-inclinado.webp";
import peckDeck from "@/assets/ex/peck-deck.webp";
import flexao from "@/assets/ex/flexao.webp";
import puxada from "@/assets/ex/puxada.webp";
import remadaCurvada from "@/assets/ex/remada-curvada.webp";
import remadaBaixa from "@/assets/ex/remada-baixa.webp";
import barraFixa from "@/assets/ex/barra-fixa.webp";
import agachamento from "@/assets/ex/agachamento.webp";
import legPress from "@/assets/ex/leg-press.webp";
import extensora from "@/assets/ex/extensora.webp";
import afundo from "@/assets/ex/afundo.webp";
import terraRomeno from "@/assets/ex/terra-romeno.webp";
import flexora from "@/assets/ex/flexora.webp";
import hipThrust from "@/assets/ex/hip-thrust.webp";
import desenvolvimento from "@/assets/ex/desenvolvimento.webp";
import elevacaoLateral from "@/assets/ex/elevacao-lateral.webp";
import facePull from "@/assets/ex/face-pull.webp";
import roscaDireta from "@/assets/ex/rosca-direta.webp";
import roscaMartelo from "@/assets/ex/rosca-martelo.webp";
import tricepsCorda from "@/assets/ex/triceps-corda.webp";
import tricepsFrances from "@/assets/ex/triceps-frances.webp";
import prancha from "@/assets/ex/prancha.webp";
import abdominalPolia from "@/assets/ex/abdominal-polia.webp";

export type Group = "peito" | "costas" | "quadriceps" | "posterior" | "ombros" | "biceps" | "triceps" | "core" | "panturrilha" | "trapezio" | "antebraco" | "cardio";

export const GROUP_LABEL: Record<Group, string> = {
  peito: "Peito",
  costas: "Costas",
  quadriceps: "Quadríceps",
  posterior: "Posterior e glúteos",
  ombros: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  core: "Abdômen",
  panturrilha: "Panturrilha",
  trapezio: "Trapézio",
  antebraco: "Antebraço",
  cardio: "Condicionamento",
};

export type Pattern =
  | "empurrar-horizontal" | "aduzir-ombro" | "empurrar-vertical" | "abduzir-ombro" | "abrir-ombro-posterior"
  | "puxar-horizontal" | "puxar-vertical" | "agachar" | "unilateral-joelho" | "estender-joelho"
  | "dobrar-quadril" | "flexionar-joelho" | "estender-quadril" | "flexionar-cotovelo" | "estender-cotovelo"
  | "estabilizar-core" | "flexionar-tronco"
  | "flexionar-plantar" | "encolher-ombros" | "punho" | "carregar" | "cardio";

export type Exercise = {
  id: string;
  name: string;
  group: Group;
  equipment: string;
  compound: boolean;
  img: string;
  steps: string[];
  posture: string[];
  pattern: Pattern;
  /** Exercise whose illustration/animation is reused as a visual reference. */
  mediaId?: string;
  /** Swap-only option: the plan generator keeps using the original library. */
  extra?: boolean;
};

const BASE: Exercise[] = [
  {
    id: "supino-reto", name: "Supino reto com barra", group: "peito", equipment: "Barra e banco", compound: true, img: supinoReto, pattern: "empurrar-horizontal",
    steps: ["Deite no banco com os olhos abaixo da barra.", "Segure a barra um pouco além da largura dos ombros.", "Desça controlando até tocar o meio do peito.", "Empurre de volta até estender os braços."],
    posture: ["Escápulas juntas e para baixo durante todo o movimento.", "Pés firmes no chão, glúteos no banco.", "Cotovelos a ~45° do corpo, não abertos a 90°.", "Punhos retos, alinhados com o antebraço."],
  },
  {
    id: "supino-inclinado", name: "Supino inclinado com halteres", group: "peito", equipment: "Halteres e banco", compound: true, img: supinoInclinado, pattern: "empurrar-horizontal",
    steps: ["Ajuste o banco entre 30° e 45°.", "Comece com os halteres na altura do peito.", "Empurre para cima aproximando-os no topo.", "Desça devagar até sentir alongar o peito."],
    posture: ["Mantenha o peito aberto e as escápulas encaixadas.", "Não arqueie demais a lombar.", "Controle a descida em 2–3 segundos."],
  },
  {
    id: "peck-deck", name: "Crucifixo na máquina (peck deck)", group: "peito", equipment: "Máquina", compound: false, img: peckDeck, pattern: "aduzir-ombro",
    steps: ["Ajuste o banco para as alças ficarem na altura do peito.", "Com cotovelos levemente flexionados, junte as alças à frente.", "Segure 1 segundo e volte devagar."],
    posture: ["Costas totalmente apoiadas no encosto.", "Ombros baixos, longe das orelhas.", "Não deixe o peso bater no final."],
  },
  {
    id: "flexao", name: "Flexão de braço", group: "peito", equipment: "Peso corporal", compound: true, img: flexao, pattern: "empurrar-horizontal",
    steps: ["Mãos no chão um pouco além dos ombros.", "Desça o corpo inteiro até o peito quase tocar o chão.", "Empurre de volta à posição inicial."],
    posture: ["Corpo em linha reta da cabeça aos calcanhares.", "Abdômen e glúteos contraídos.", "Se precisar, apoie os joelhos."],
  },
  {
    id: "puxada", name: "Puxada frontal", group: "costas", equipment: "Polia alta", compound: true, img: puxada, pattern: "puxar-vertical",
    steps: ["Sente-se e prenda as coxas sob o apoio.", "Segure a barra com pegada aberta.", "Puxe até a parte alta do peito.", "Volte devagar estendendo os braços."],
    posture: ["Peito para cima, leve inclinação para trás.", "Puxe com os cotovelos, não com as mãos.", "Não balance o tronco para ganhar impulso."],
  },
  {
    id: "remada-curvada", name: "Remada curvada com barra", group: "costas", equipment: "Barra", compound: true, img: remadaCurvada, pattern: "puxar-horizontal",
    steps: ["Incline o tronco à frente (~45°) com joelhos levemente flexionados.", "Puxe a barra em direção ao umbigo.", "Desça controlando."],
    posture: ["Coluna neutra — nunca arredonde as costas.", "Abdômen firme para proteger a lombar.", "Esprema as escápulas no topo."],
  },
  {
    id: "remada-baixa", name: "Remada baixa no cabo", group: "costas", equipment: "Polia baixa", compound: true, img: remadaBaixa, pattern: "puxar-horizontal",
    steps: ["Sente com os pés apoiados e joelhos levemente flexionados.", "Puxe o triângulo até o abdômen.", "Estenda os braços devagar."],
    posture: ["Tronco ereto, sem jogar o corpo para trás.", "Ombros baixos.", "Junte as escápulas no fim do movimento."],
  },
  {
    id: "barra-fixa", name: "Barra fixa", group: "costas", equipment: "Barra fixa", compound: true, img: barraFixa, pattern: "puxar-vertical",
    steps: ["Segure a barra com as palmas para frente.", "Puxe até o queixo passar a barra.", "Desça até estender os braços."],
    posture: ["Comece puxando os ombros para baixo.", "Evite balançar as pernas.", "Use elástico ou máquina assistida se necessário."],
  },
  {
    id: "agachamento", name: "Agachamento livre", group: "quadriceps", equipment: "Barra e rack", compound: true, img: agachamento, pattern: "agachar",
    steps: ["Barra apoiada no trapézio, pés na largura dos ombros.", "Desça empurrando o quadril para trás e para baixo.", "Vá até as coxas ficarem paralelas ao chão.", "Suba empurrando o chão."],
    posture: ["Peito aberto e olhar à frente.", "Joelhos seguem a direção da ponta dos pés.", "Calcanhares sempre no chão.", "Coluna neutra do início ao fim."],
  },
  {
    id: "leg-press", name: "Leg press 45°", group: "quadriceps", equipment: "Máquina", compound: true, img: legPress, pattern: "agachar",
    steps: ["Pés na plataforma na largura dos ombros.", "Destrave e desça até ~90° nos joelhos.", "Empurre sem travar totalmente os joelhos."],
    posture: ["Lombar e glúteos colados no encosto.", "Não deixe o quadril sair do banco ao descer.", "Joelhos alinhados com os pés."],
  },
  {
    id: "extensora", name: "Cadeira extensora", group: "quadriceps", equipment: "Máquina", compound: false, img: extensora, pattern: "estender-joelho",
    steps: ["Ajuste o rolo logo acima dos tornozelos.", "Estenda as pernas completamente.", "Segure 1 segundo e desça devagar."],
    posture: ["Costas apoiadas e mãos nas alças laterais.", "Joelho alinhado ao eixo da máquina.", "Sem chutar o peso."],
  },
  {
    id: "afundo", name: "Afundo com halteres", group: "quadriceps", equipment: "Halteres", compound: true, img: afundo, pattern: "unilateral-joelho",
    steps: ["Em pé, dê um passo largo à frente.", "Desça até o joelho de trás quase tocar o chão.", "Volte empurrando com a perna da frente."],
    posture: ["Tronco ereto.", "Joelho da frente acima do tornozelo.", "Passo largo o suficiente para formar 90° nas duas pernas."],
  },
  {
    id: "terra-romeno", name: "Levantamento terra romeno", group: "posterior", equipment: "Barra", compound: true, img: terraRomeno, pattern: "dobrar-quadril",
    steps: ["Em pé segurando a barra na frente das coxas.", "Leve o quadril para trás deslizando a barra pelas pernas.", "Desça até o meio da canela e volte contraindo glúteos."],
    posture: ["Costas retas, nunca arredondadas.", "Joelhos levemente flexionados e fixos.", "Barra sempre colada ao corpo."],
  },
  {
    id: "flexora", name: "Mesa flexora", group: "posterior", equipment: "Máquina", compound: false, img: flexora, pattern: "flexionar-joelho",
    steps: ["Deite de bruços com o rolo acima dos calcanhares.", "Flexione os joelhos trazendo os calcanhares ao glúteo.", "Desça controlando."],
    posture: ["Quadril colado no banco.", "Não levante o tronco.", "Movimento lento na volta."],
  },
  {
    id: "hip-thrust", name: "Elevação pélvica com barra", group: "posterior", equipment: "Barra e banco", compound: true, img: hipThrust, pattern: "estender-quadril",
    steps: ["Apoie a parte alta das costas no banco, barra sobre o quadril.", "Empurre o quadril para cima até alinhar com o tronco.", "Contraia os glúteos no topo e desça."],
    posture: ["Queixo levemente recolhido.", "Canelas verticais no topo.", "Não hiperestenda a lombar."],
  },
  {
    id: "desenvolvimento", name: "Desenvolvimento com halteres", group: "ombros", equipment: "Halteres e banco", compound: true, img: desenvolvimento, pattern: "empurrar-vertical",
    steps: ["Sentado, halteres na altura das orelhas.", "Empurre para cima até quase estender os braços.", "Desça até a altura inicial."],
    posture: ["Costas apoiadas no encosto.", "Abdômen firme, sem arquear a lombar.", "Antebraços na vertical."],
  },
  {
    id: "elevacao-lateral", name: "Elevação lateral", group: "ombros", equipment: "Halteres", compound: false, img: elevacaoLateral, pattern: "abduzir-ombro",
    steps: ["Em pé com halteres ao lado do corpo.", "Eleve os braços pelas laterais até a altura dos ombros.", "Desça devagar."],
    posture: ["Cotovelos levemente flexionados.", "Não suba os ombros em direção às orelhas.", "Sem balançar o tronco."],
  },
  {
    id: "face-pull", name: "Face pull na polia", group: "ombros", equipment: "Polia com corda", compound: false, img: facePull, pattern: "abrir-ombro-posterior",
    steps: ["Corda na polia na altura do rosto.", "Puxe em direção à testa abrindo as mãos.", "Volte controlando."],
    posture: ["Cotovelos altos, na linha dos ombros.", "Esprema as escápulas.", "Tronco firme e parado."],
  },
  {
    id: "rosca-direta", name: "Rosca direta com barra", group: "biceps", equipment: "Barra", compound: false, img: roscaDireta, pattern: "flexionar-cotovelo",
    steps: ["Em pé, segure a barra com as palmas para frente.", "Flexione os cotovelos levando a barra aos ombros.", "Desça devagar até estender."],
    posture: ["Cotovelos colados ao corpo.", "Não jogue o tronco para trás.", "Punhos firmes e retos."],
  },
  {
    id: "rosca-martelo", name: "Rosca martelo", group: "biceps", equipment: "Halteres", compound: false, img: roscaMartelo, pattern: "flexionar-cotovelo",
    steps: ["Halteres ao lado do corpo com palmas voltadas uma para a outra.", "Flexione um braço de cada vez (ou os dois).", "Desça controlando."],
    posture: ["Cotovelos fixos ao lado do tronco.", "Ombros relaxados.", "Sem impulso."],
  },
  {
    id: "triceps-corda", name: "Tríceps na polia com corda", group: "triceps", equipment: "Polia com corda", compound: false, img: tricepsCorda, pattern: "estender-cotovelo",
    steps: ["Segure a corda na polia alta.", "Estenda os cotovelos levando as mãos para baixo.", "Abra a corda no final e volte devagar."],
    posture: ["Cotovelos colados ao corpo e parados.", "Tronco levemente inclinado à frente.", "Só o antebraço se move."],
  },
  {
    id: "triceps-frances", name: "Tríceps francês com halter", group: "triceps", equipment: "Halter e banco", compound: false, img: tricepsFrances, pattern: "estender-cotovelo",
    steps: ["Sentado, segure um halter com as duas mãos acima da cabeça.", "Desça o halter atrás da cabeça flexionando os cotovelos.", "Estenda os braços de volta."],
    posture: ["Cotovelos apontando para cima, próximos da cabeça.", "Abdômen contraído, sem arquear as costas.", "Movimento lento."],
  },
  {
    id: "prancha", name: "Prancha", group: "core", equipment: "Colchonete", compound: false, img: prancha, pattern: "estabilizar-core",
    steps: ["Apoie antebraços e pontas dos pés no chão.", "Mantenha a posição pelo tempo indicado."],
    posture: ["Corpo reto como uma tábua.", "Quadril nem alto nem caído.", "Contraia abdômen e glúteos, respire normalmente."],
  },
  {
    id: "abdominal-polia", name: "Abdominal na polia", group: "core", equipment: "Polia com corda", compound: false, img: abdominalPolia, pattern: "flexionar-tronco",
    steps: ["Ajoelhe de frente para a polia segurando a corda ao lado da cabeça.", "Enrole a coluna levando os cotovelos aos joelhos.", "Volte devagar."],
    posture: ["O movimento vem do abdômen, não dos braços.", "Quadril parado.", "Expire ao descer."],
  },
];

type Extra = Omit<Exercise, "img" | "mediaId" | "extra"> & { media: string };

// Swap options. `media` points to the original exercise with the closest-looking illustration.
const EXTRAS: Extra[] = [
  // Peito — empurrar
  {
    id: "supino-reto-halteres", name: "Supino reto com halteres", group: "peito", equipment: "Halteres e banco", compound: true, pattern: "empurrar-horizontal", media: "supino-inclinado",
    steps: ["Deite no banco reto com um halter em cada mão na altura do peito.", "Empurre para cima aproximando os halteres no topo.", "Desça devagar até os cotovelos ficarem um pouco abaixo do banco."],
    posture: ["Escápulas juntas e pés firmes no chão.", "Cotovelos a ~45° do tronco.", "Não deixe os halteres baterem no topo."],
  },
  {
    id: "supino-maquina", name: "Supino na máquina (chest press)", group: "peito", equipment: "Máquina", compound: true, pattern: "empurrar-horizontal", media: "supino-reto",
    steps: ["Ajuste o banco para as alças ficarem na linha do meio do peito.", "Empurre as alças à frente até quase estender os braços.", "Volte devagar até sentir o peito alongar."],
    posture: ["Costas e cabeça apoiadas no encosto.", "Ombros baixos, longe das orelhas.", "Não trave os cotovelos no final."],
  },
  {
    id: "supino-inclinado-barra", name: "Supino inclinado com barra", group: "peito", equipment: "Barra e banco", compound: true, pattern: "empurrar-horizontal", media: "supino-reto",
    steps: ["Ajuste o banco entre 30° e 45° e deite com os olhos abaixo da barra.", "Desça a barra até a parte alta do peito.", "Empurre de volta até estender os braços."],
    posture: ["Escápulas juntas e para baixo.", "Glúteos no banco, sem tirar o quadril.", "Punhos retos sobre os cotovelos."],
  },
  {
    id: "supino-smith", name: "Supino reto no Smith", group: "peito", equipment: "Máquina Smith e banco", compound: true, pattern: "empurrar-horizontal", media: "supino-reto",
    steps: ["Posicione o banco para a barra descer no meio do peito.", "Destrave a barra girando os punhos.", "Desça controlando e empurre de volta."],
    posture: ["Pés firmes e glúteos no banco.", "Cotovelos a ~45° do corpo.", "Trave a barra nos ganchos ao terminar."],
  },
  {
    id: "flexao-inclinada", name: "Flexão inclinada (mãos no banco)", group: "peito", equipment: "Peso corporal e banco", compound: true, pattern: "empurrar-horizontal", media: "flexao",
    steps: ["Apoie as mãos na borda de um banco, um pouco além da largura dos ombros.", "Desça o peito até perto do banco.", "Empurre de volta estendendo os braços."],
    posture: ["Corpo reto da cabeça aos calcanhares.", "Abdômen e glúteos contraídos.", "Quanto mais alto o apoio, mais fácil."],
  },
  // Peito — crucifixo
  {
    id: "crucifixo-halteres", name: "Crucifixo com halteres", group: "peito", equipment: "Halteres e banco", compound: false, pattern: "aduzir-ombro", media: "supino-inclinado",
    steps: ["Deite no banco com os halteres acima do peito, palmas uma para a outra.", "Abra os braços em arco até sentir o peito alongar.", "Feche o arco trazendo os halteres de volta ao topo."],
    posture: ["Cotovelos levemente flexionados e fixos.", "Não desça além da linha dos ombros.", "Movimento lento, sem impulso."],
  },
  {
    id: "crucifixo-inclinado", name: "Crucifixo inclinado com halteres", group: "peito", equipment: "Halteres e banco", compound: false, pattern: "aduzir-ombro", media: "supino-inclinado",
    steps: ["Ajuste o banco a 30° e segure os halteres acima do peito.", "Abra os braços em arco até a altura dos ombros.", "Feche o arco contraindo a parte alta do peito."],
    posture: ["Cotovelos levemente flexionados.", "Lombar apoiada no banco.", "Desça devagar, em 2–3 segundos."],
  },
  {
    id: "crossover", name: "Crossover na polia", group: "peito", equipment: "Polia alta", compound: false, pattern: "aduzir-ombro", media: "peck-deck",
    steps: ["Fique no centro do aparelho segurando as alças das polias altas.", "Com o tronco levemente inclinado, junte as mãos à frente do corpo.", "Volte devagar abrindo os braços."],
    posture: ["Cotovelos levemente flexionados.", "Um pé à frente para dar base.", "Ombros baixos durante todo o movimento."],
  },
  // Costas — puxar na vertical
  {
    id: "puxada-supinada", name: "Puxada supinada", group: "costas", equipment: "Polia alta", compound: true, pattern: "puxar-vertical", media: "puxada",
    steps: ["Sente e prenda as coxas sob o apoio.", "Segure a barra com as palmas para você, na largura dos ombros.", "Puxe até a parte alta do peito e volte devagar."],
    posture: ["Peito para cima.", "Puxe com os cotovelos, levando-os para baixo.", "Sem balançar o tronco."],
  },
  {
    id: "puxada-triangulo", name: "Puxada com triângulo", group: "costas", equipment: "Polia alta com triângulo", compound: true, pattern: "puxar-vertical", media: "puxada",
    steps: ["Prenda o triângulo na polia alta e sente com as coxas presas.", "Puxe o triângulo até a parte alta do peito.", "Estenda os braços devagar."],
    posture: ["Leve inclinação do tronco para trás.", "Ombros baixos.", "Esprema as costas no fim da puxada."],
  },
  {
    id: "barra-fixa-assistida", name: "Barra fixa assistida", group: "costas", equipment: "Máquina assistida", compound: true, pattern: "puxar-vertical", media: "barra-fixa",
    steps: ["Ajuste o peso de assistência e apoie os joelhos na plataforma.", "Segure a barra com as palmas para frente.", "Puxe até o queixo passar a barra e desça controlando."],
    posture: ["Comece puxando os ombros para baixo.", "Tronco firme, sem balançar.", "Quanto mais peso na máquina, mais fácil."],
  },
  {
    id: "pulldown-bracos-estendidos", name: "Pulldown com braços estendidos", group: "costas", equipment: "Polia alta", compound: false, pattern: "puxar-vertical", media: "puxada",
    steps: ["Em pé, de frente para a polia, segure a barra com os braços estendidos.", "Leve a barra até as coxas mantendo os braços quase retos.", "Volte devagar até a altura dos olhos."],
    posture: ["Tronco levemente inclinado à frente.", "Cotovelos levemente flexionados e fixos.", "O movimento vem dos ombros, não dos cotovelos."],
  },
  // Costas — remadas
  {
    id: "remada-unilateral", name: "Remada unilateral com halter", group: "costas", equipment: "Halter e banco", compound: true, pattern: "puxar-horizontal", media: "remada-curvada",
    steps: ["Apoie um joelho e uma mão no banco, halter na outra mão.", "Puxe o halter em direção ao quadril.", "Desça até estender o braço. Troque de lado."],
    posture: ["Costas retas e paralelas ao chão.", "Não gire o tronco para subir o peso.", "Cotovelo perto do corpo."],
  },
  {
    id: "remada-maquina", name: "Remada na máquina", group: "costas", equipment: "Máquina", compound: true, pattern: "puxar-horizontal", media: "remada-baixa",
    steps: ["Ajuste o banco para as alças ficarem na altura do meio do peito.", "Puxe as alças levando os cotovelos para trás.", "Volte devagar estendendo os braços."],
    posture: ["Peito apoiado no encosto.", "Ombros baixos.", "Junte as escápulas no fim do movimento."],
  },
  {
    id: "remada-cavalinho", name: "Remada cavalinho (barra T)", group: "costas", equipment: "Barra T", compound: true, pattern: "puxar-horizontal", media: "remada-curvada",
    steps: ["Fique sobre a barra com os pés firmes e segure as alças.", "Com o tronco inclinado, puxe a barra até o abdômen.", "Desça controlando."],
    posture: ["Coluna neutra, nunca arredondada.", "Joelhos levemente flexionados.", "Abdômen firme para proteger a lombar."],
  },
  {
    id: "remada-invertida", name: "Remada invertida", group: "costas", equipment: "Peso corporal e barra baixa", compound: true, pattern: "puxar-horizontal", media: "remada-curvada",
    steps: ["Deite sob uma barra baixa (Smith ou argolas) e segure-a.", "Com o corpo reto, puxe o peito até a barra.", "Desça devagar até estender os braços."],
    posture: ["Corpo em linha reta, glúteos contraídos.", "Esprema as escápulas no topo.", "Joelhos dobrados deixam mais fácil."],
  },
  // Quadríceps — agachar
  {
    id: "agachamento-goblet", name: "Agachamento goblet", group: "quadriceps", equipment: "Halter", compound: true, pattern: "agachar", media: "agachamento",
    steps: ["Segure um halter junto ao peito, pés um pouco além da largura dos ombros.", "Desça entre as pernas até as coxas ficarem paralelas ao chão.", "Suba empurrando o chão."],
    posture: ["Peito aberto, cotovelos por dentro dos joelhos.", "Calcanhares sempre no chão.", "Joelhos na direção das pontas dos pés."],
  },
  {
    id: "hack", name: "Agachamento hack", group: "quadriceps", equipment: "Máquina", compound: true, pattern: "agachar", media: "leg-press",
    steps: ["Apoie costas e ombros na máquina, pés no meio da plataforma.", "Destrave e desça até ~90° nos joelhos.", "Suba empurrando a plataforma."],
    posture: ["Costas coladas no encosto.", "Joelhos alinhados com os pés.", "Não trave os joelhos no topo."],
  },
  {
    id: "agachamento-smith", name: "Agachamento no Smith", group: "quadriceps", equipment: "Máquina Smith", compound: true, pattern: "agachar", media: "agachamento",
    steps: ["Barra apoiada no trapézio, pés um pouco à frente da linha do corpo.", "Destrave e desça até as coxas ficarem paralelas ao chão.", "Suba empurrando o chão."],
    posture: ["Coluna neutra do início ao fim.", "Joelhos na direção dos pés.", "Trave a barra nos ganchos ao terminar."],
  },
  {
    id: "agachamento-corporal", name: "Agachamento com peso corporal", group: "quadriceps", equipment: "Peso corporal", compound: true, pattern: "agachar", media: "agachamento",
    steps: ["Pés na largura dos ombros, braços estendidos à frente.", "Desça levando o quadril para trás e para baixo.", "Suba até ficar em pé."],
    posture: ["Peito aberto e olhar à frente.", "Calcanhares no chão.", "Bom para aquecer ou para quem está começando."],
  },
  // Quadríceps — unilateral
  {
    id: "agachamento-bulgaro", name: "Agachamento búlgaro", group: "quadriceps", equipment: "Halteres e banco", compound: true, pattern: "unilateral-joelho", media: "afundo",
    steps: ["Apoie o peito do pé de trás num banco, halteres ao lado do corpo.", "Desça até a coxa da frente ficar paralela ao chão.", "Suba empurrando com a perna da frente. Troque de perna."],
    posture: ["Tronco ereto ou levemente inclinado.", "Joelho da frente alinhado com o pé.", "Comece sem peso até ter equilíbrio."],
  },
  {
    id: "subida-banco", name: "Subida no banco (step-up)", group: "quadriceps", equipment: "Halteres e banco", compound: true, pattern: "unilateral-joelho", media: "afundo",
    steps: ["De frente para um banco firme, apoie um pé inteiro em cima.", "Suba empurrando com a perna de cima até ficar em pé no banco.", "Desça devagar. Troque de perna."],
    posture: ["Banco na altura do joelho ou mais baixo.", "Não dê impulso com o pé de baixo.", "Joelho alinhado com o pé."],
  },
  {
    id: "afundo-reverso", name: "Afundo reverso", group: "quadriceps", equipment: "Halteres ou peso corporal", compound: true, pattern: "unilateral-joelho", media: "afundo",
    steps: ["Em pé, dê um passo largo para trás.", "Desça até o joelho de trás quase tocar o chão.", "Volte empurrando com a perna da frente."],
    posture: ["Tronco ereto.", "Joelho da frente acima do tornozelo.", "Costuma ser mais confortável para os joelhos que o afundo à frente."],
  },
  // Quadríceps — extensão de joelho
  {
    id: "extensora-unilateral", name: "Cadeira extensora unilateral", group: "quadriceps", equipment: "Máquina", compound: false, pattern: "estender-joelho", media: "extensora",
    steps: ["Ajuste o rolo logo acima do tornozelo de uma perna.", "Estenda a perna completamente.", "Desça devagar. Troque de perna."],
    posture: ["Costas apoiadas e mãos nas alças.", "Joelho alinhado ao eixo da máquina.", "Use menos carga que na versão com as duas pernas."],
  },
  // Posterior — dobrar o quadril
  {
    id: "stiff-halteres", name: "Stiff com halteres", group: "posterior", equipment: "Halteres", compound: true, pattern: "dobrar-quadril", media: "terra-romeno",
    steps: ["Em pé com os halteres na frente das coxas.", "Leve o quadril para trás descendo os halteres rente às pernas.", "Desça até o meio da canela e volte contraindo os glúteos."],
    posture: ["Costas retas, nunca arredondadas.", "Joelhos levemente flexionados e fixos.", "Halteres sempre perto do corpo."],
  },
  {
    id: "terra-romeno-unilateral", name: "Terra romeno unilateral", group: "posterior", equipment: "Halter", compound: true, pattern: "dobrar-quadril", media: "terra-romeno",
    steps: ["Em pé numa perna, halter na mão do lado oposto.", "Incline o tronco à frente levando a outra perna para trás.", "Volte contraindo o glúteo da perna de apoio. Troque de lado."],
    posture: ["Quadril alinhado, sem girar.", "Costas retas.", "Se perder o equilíbrio, apoie a mão livre numa parede."],
  },
  {
    id: "pull-through", name: "Pull-through no cabo", group: "posterior", equipment: "Polia baixa com corda", compound: true, pattern: "dobrar-quadril", media: "terra-romeno",
    steps: ["De costas para a polia baixa, segure a corda entre as pernas.", "Leve o quadril para trás deixando a corda passar entre as pernas.", "Volte à posição em pé empurrando o quadril à frente."],
    posture: ["Costas retas.", "Os braços só seguram a corda.", "Contraia os glúteos no topo."],
  },
  {
    id: "hiperextensao", name: "Hiperextensão no banco 45°", group: "posterior", equipment: "Banco romano", compound: false, pattern: "dobrar-quadril", media: "terra-romeno",
    steps: ["Apoie o quadril na almofada e prenda os pés.", "Desça o tronco dobrando o quadril.", "Suba até alinhar o tronco com as pernas."],
    posture: ["Não suba além da linha do corpo.", "Costas retas.", "Braços cruzados no peito."],
  },
  // Posterior — flexão de joelho
  {
    id: "cadeira-flexora", name: "Cadeira flexora", group: "posterior", equipment: "Máquina", compound: false, pattern: "flexionar-joelho", media: "flexora",
    steps: ["Sente com o rolo atrás dos tornozelos e trave as coxas.", "Flexione os joelhos levando os calcanhares para baixo do banco.", "Volte devagar."],
    posture: ["Costas apoiadas.", "Quadril parado no banco.", "Sem dar tranco no início."],
  },
  {
    id: "flexora-em-pe", name: "Flexora em pé (unilateral)", group: "posterior", equipment: "Máquina", compound: false, pattern: "flexionar-joelho", media: "flexora",
    steps: ["Apoie a coxa na almofada com o rolo atrás do tornozelo.", "Flexione o joelho trazendo o calcanhar ao glúteo.", "Desça devagar. Troque de perna."],
    posture: ["Tronco apoiado e firme.", "Quadril não sai da posição.", "Movimento lento."],
  },
  {
    id: "flexao-joelhos-bola", name: "Flexão de joelhos na bola suíça", group: "posterior", equipment: "Bola suíça", compound: false, pattern: "flexionar-joelho", media: "hip-thrust",
    steps: ["Deite de costas com os calcanhares sobre a bola.", "Eleve o quadril e puxe a bola em direção ao glúteo.", "Estenda as pernas devagar mantendo o quadril alto."],
    posture: ["Quadril alto o tempo todo.", "Braços no chão para equilíbrio.", "Abdômen firme."],
  },
  // Posterior — glúteos
  {
    id: "elevacao-pelvica-maquina", name: "Elevação pélvica na máquina", group: "posterior", equipment: "Máquina", compound: true, pattern: "estender-quadril", media: "hip-thrust",
    steps: ["Apoie as costas no encosto com o cinto sobre o quadril.", "Empurre o quadril para cima até alinhar com o tronco.", "Contraia os glúteos e desça."],
    posture: ["Queixo levemente recolhido.", "Canelas verticais no topo.", "Não hiperestenda a lombar."],
  },
  {
    id: "hip-thrust-halter", name: "Elevação pélvica com halter", group: "posterior", equipment: "Halter e banco", compound: true, pattern: "estender-quadril", media: "hip-thrust",
    steps: ["Apoie a parte alta das costas no banco, halter sobre o quadril.", "Empurre o quadril para cima até alinhar com o tronco.", "Contraia os glúteos no topo e desça."],
    posture: ["Segure o halter com as duas mãos.", "Queixo recolhido.", "Canelas verticais no topo."],
  },
  {
    id: "ponte-gluteo", name: "Ponte de glúteo", group: "posterior", equipment: "Peso corporal", compound: false, pattern: "estender-quadril", media: "hip-thrust",
    steps: ["Deite de costas com os joelhos dobrados e os pés no chão.", "Eleve o quadril até alinhar com o tronco.", "Segure 1 segundo e desça."],
    posture: ["Empurre com os calcanhares.", "Não arqueie a lombar.", "Um halter sobre o quadril deixa mais difícil."],
  },
  {
    id: "gluteo-cabo", name: "Glúteo no cabo (coice)", group: "posterior", equipment: "Polia baixa com tornozeleira", compound: false, pattern: "estender-quadril", media: "hip-thrust",
    steps: ["Prenda a tornozeleira na polia baixa e segure no aparelho.", "Leve a perna para trás estendendo o quadril.", "Volte devagar. Troque de perna."],
    posture: ["Tronco levemente inclinado e firme.", "Não arqueie a lombar.", "O movimento vem do quadril."],
  },
  // Ombros — desenvolvimento
  {
    id: "desenvolvimento-maquina", name: "Desenvolvimento na máquina", group: "ombros", equipment: "Máquina", compound: true, pattern: "empurrar-vertical", media: "desenvolvimento",
    steps: ["Ajuste o banco para as alças ficarem na altura dos ombros.", "Empurre para cima até quase estender os braços.", "Desça devagar até a altura inicial."],
    posture: ["Costas apoiadas no encosto.", "Abdômen firme, sem arquear a lombar.", "Não trave os cotovelos no topo."],
  },
  {
    id: "arnold", name: "Desenvolvimento Arnold", group: "ombros", equipment: "Halteres e banco", compound: true, pattern: "empurrar-vertical", media: "desenvolvimento",
    steps: ["Sentado, halteres na frente dos ombros com as palmas para você.", "Empurre para cima girando as palmas para frente.", "Desça desfazendo a rotação."],
    posture: ["Costas apoiadas.", "Giro suave, sem pressa.", "Use menos carga que no desenvolvimento comum."],
  },
  {
    id: "desenvolvimento-barra", name: "Desenvolvimento em pé com barra", group: "ombros", equipment: "Barra", compound: true, pattern: "empurrar-vertical", media: "desenvolvimento",
    steps: ["Em pé, barra apoiada na frente dos ombros.", "Empurre a barra para cima passando rente ao rosto.", "Desça até a altura do queixo."],
    posture: ["Glúteos e abdômen contraídos.", "Não incline o tronco para trás.", "Cabeça passa à frente quando a barra sobe."],
  },
  {
    id: "desenvolvimento-smith", name: "Desenvolvimento no Smith", group: "ombros", equipment: "Máquina Smith e banco", compound: true, pattern: "empurrar-vertical", media: "desenvolvimento",
    steps: ["Sente com o banco a 90° e a barra na altura do queixo.", "Destrave e empurre para cima.", "Desça controlando até o queixo."],
    posture: ["Costas apoiadas.", "Cotovelos levemente à frente do corpo.", "Trave a barra nos ganchos ao terminar."],
  },
  // Ombros — elevação lateral
  {
    id: "elevacao-lateral-cabo", name: "Elevação lateral no cabo", group: "ombros", equipment: "Polia baixa", compound: false, pattern: "abduzir-ombro", media: "elevacao-lateral",
    steps: ["De lado para a polia baixa, segure a alça com a mão mais distante.", "Eleve o braço pela lateral até a altura do ombro.", "Desça devagar. Troque de lado."],
    posture: ["Cotovelo levemente flexionado.", "Não suba o ombro em direção à orelha.", "Tronco parado."],
  },
  {
    id: "elevacao-lateral-maquina", name: "Elevação lateral na máquina", group: "ombros", equipment: "Máquina", compound: false, pattern: "abduzir-ombro", media: "elevacao-lateral",
    steps: ["Sente com as almofadas na parte de fora dos braços.", "Eleve os braços pelas laterais até a altura dos ombros.", "Desça devagar."],
    posture: ["Peito apoiado ou costas retas.", "Ombros baixos.", "Sem dar tranco."],
  },
  {
    id: "elevacao-lateral-sentado", name: "Elevação lateral sentado", group: "ombros", equipment: "Halteres e banco", compound: false, pattern: "abduzir-ombro", media: "elevacao-lateral",
    steps: ["Sentado na ponta do banco, halteres ao lado do corpo.", "Eleve os braços pelas laterais até a altura dos ombros.", "Desça devagar."],
    posture: ["Tronco ereto, sem balançar.", "Cotovelos levemente flexionados.", "Sentado fica mais difícil roubar com o corpo."],
  },
  // Ombros — posterior
  {
    id: "crucifixo-inverso", name: "Crucifixo inverso com halteres", group: "ombros", equipment: "Halteres e banco", compound: false, pattern: "abrir-ombro-posterior", media: "face-pull",
    steps: ["Deite de bruços num banco inclinado com os halteres pendurados.", "Abra os braços para os lados até a altura dos ombros.", "Desça devagar."],
    posture: ["Cotovelos levemente flexionados.", "Esprema as escápulas no topo.", "Use pouca carga."],
  },
  {
    id: "peck-deck-inverso", name: "Crucifixo inverso na máquina", group: "ombros", equipment: "Máquina", compound: false, pattern: "abrir-ombro-posterior", media: "peck-deck",
    steps: ["Sente de frente para o encosto e segure as alças na altura dos ombros.", "Abra os braços para trás em arco.", "Volte devagar."],
    posture: ["Peito colado no encosto.", "Ombros baixos.", "Braços quase estendidos."],
  },
  {
    id: "crucifixo-inverso-cabo", name: "Crucifixo inverso no cabo", group: "ombros", equipment: "Polia alta", compound: false, pattern: "abrir-ombro-posterior", media: "face-pull",
    steps: ["Entre as polias altas, segure o cabo esquerdo com a mão direita e vice-versa.", "Abra os braços para trás na altura dos ombros.", "Volte devagar cruzando os braços à frente."],
    posture: ["Cotovelos levemente flexionados.", "Tronco firme.", "Esprema as escápulas no fim."],
  },
  {
    id: "face-pull-elastico", name: "Face pull com elástico", group: "ombros", equipment: "Elástico", compound: false, pattern: "abrir-ombro-posterior", media: "face-pull",
    steps: ["Prenda o elástico na altura do rosto.", "Puxe em direção à testa abrindo as mãos.", "Volte controlando."],
    posture: ["Cotovelos altos, na linha dos ombros.", "Esprema as escápulas.", "Bom para fazer em casa."],
  },
  {
    id: "elevacao-y", name: "Elevação em Y no banco inclinado", group: "ombros", equipment: "Halteres e banco", compound: false, pattern: "abrir-ombro-posterior", media: "elevacao-lateral",
    steps: ["Deite de bruços num banco a 30–45° com os halteres pendurados.", "Eleve os braços à frente formando um Y.", "Desça devagar."],
    posture: ["Polegares para cima.", "Ombros longe das orelhas.", "Use halteres bem leves."],
  },
  // Bíceps
  {
    id: "rosca-alternada", name: "Rosca alternada com halteres", group: "biceps", equipment: "Halteres", compound: false, pattern: "flexionar-cotovelo", media: "rosca-martelo",
    steps: ["Em pé com os halteres ao lado do corpo.", "Flexione um braço girando a palma para cima.", "Desça devagar e alterne os braços."],
    posture: ["Cotovelos colados ao corpo.", "Sem balançar o tronco.", "Punhos firmes."],
  },
  {
    id: "rosca-scott", name: "Rosca Scott", group: "biceps", equipment: "Barra W e banco Scott", compound: false, pattern: "flexionar-cotovelo", media: "rosca-direta",
    steps: ["Apoie a parte de trás dos braços no banco Scott.", "Flexione os cotovelos levando a barra aos ombros.", "Desça devagar sem estender totalmente."],
    posture: ["Axilas encostadas no topo do apoio.", "Não tire os braços do apoio.", "Descida lenta."],
  },
  {
    id: "rosca-polia", name: "Rosca na polia baixa", group: "biceps", equipment: "Polia baixa com barra", compound: false, pattern: "flexionar-cotovelo", media: "rosca-direta",
    steps: ["De frente para a polia baixa, segure a barra com as palmas para cima.", "Flexione os cotovelos levando a barra ao peito.", "Desça devagar."],
    posture: ["Cotovelos fixos ao lado do tronco.", "Tronco parado.", "O cabo mantém tensão em todo o movimento."],
  },
  {
    id: "rosca-concentrada", name: "Rosca concentrada", group: "biceps", equipment: "Halter e banco", compound: false, pattern: "flexionar-cotovelo", media: "rosca-martelo",
    steps: ["Sentado, apoie o cotovelo na parte de dentro da coxa.", "Flexione o braço levando o halter ao ombro.", "Desça devagar. Troque de braço."],
    posture: ["Cotovelo fixo na coxa.", "Só o antebraço se move.", "Tronco parado."],
  },
  {
    id: "rosca-inclinada", name: "Rosca no banco inclinado", group: "biceps", equipment: "Halteres e banco", compound: false, pattern: "flexionar-cotovelo", media: "rosca-martelo",
    steps: ["Sente num banco a 45° com os braços pendurados.", "Flexione os cotovelos girando as palmas para cima.", "Desça devagar até estender."],
    posture: ["Costas apoiadas.", "Cotovelos apontando para o chão.", "Use menos carga que na rosca em pé."],
  },
  // Tríceps
  {
    id: "triceps-barra-polia", name: "Tríceps na polia com barra", group: "triceps", equipment: "Polia alta com barra", compound: false, pattern: "estender-cotovelo", media: "triceps-corda",
    steps: ["Segure a barra na polia alta com as palmas para baixo.", "Estenda os cotovelos levando a barra até as coxas.", "Volte devagar."],
    posture: ["Cotovelos colados ao corpo e parados.", "Tronco levemente inclinado.", "Só o antebraço se move."],
  },
  {
    id: "triceps-testa", name: "Tríceps testa", group: "triceps", equipment: "Barra W e banco", compound: false, pattern: "estender-cotovelo", media: "triceps-frances",
    steps: ["Deite no banco com a barra acima do peito.", "Flexione os cotovelos descendo a barra em direção à testa.", "Estenda os braços de volta."],
    posture: ["Cotovelos apontando para cima, sem abrir.", "Descida lenta e controlada.", "Comece com pouca carga."],
  },
  {
    id: "triceps-frances-polia", name: "Tríceps francês na polia", group: "triceps", equipment: "Polia com corda", compound: false, pattern: "estender-cotovelo", media: "triceps-corda",
    steps: ["De costas para a polia, segure a corda atrás da cabeça.", "Estenda os cotovelos levando as mãos à frente e acima.", "Volte devagar."],
    posture: ["Cotovelos perto da cabeça.", "Um pé à frente para dar base.", "Abdômen firme."],
  },
  {
    id: "triceps-coice", name: "Tríceps coice com halter", group: "triceps", equipment: "Halter e banco", compound: false, pattern: "estender-cotovelo", media: "triceps-frances",
    steps: ["Apoie um joelho e uma mão no banco, braço de trabalho junto ao corpo.", "Estenda o cotovelo levando o halter para trás.", "Volte devagar. Troque de braço."],
    posture: ["Braço paralelo ao chão e parado.", "Costas retas.", "Use pouca carga."],
  },
  {
    id: "flexao-fechada", name: "Flexão fechada", group: "triceps", equipment: "Peso corporal", compound: true, pattern: "estender-cotovelo", media: "flexao",
    steps: ["Mãos no chão na largura dos ombros ou um pouco menos.", "Desça com os cotovelos rentes ao corpo.", "Empurre de volta."],
    posture: ["Corpo em linha reta.", "Cotovelos apontando para trás.", "Apoie os joelhos se precisar."],
  },
  // Abdômen — estabilizar
  {
    id: "prancha-lateral", name: "Prancha lateral", group: "core", equipment: "Colchonete", compound: false, pattern: "estabilizar-core", media: "prancha",
    steps: ["Deite de lado apoiado no antebraço, cotovelo abaixo do ombro.", "Eleve o quadril até o corpo ficar reto.", "Mantenha pelo tempo indicado e troque de lado."],
    posture: ["Quadril alto, sem cair.", "Corpo reto da cabeça aos pés.", "Joelhos no chão deixam mais fácil."],
  },
  {
    id: "dead-bug", name: "Dead bug", group: "core", equipment: "Colchonete", compound: false, pattern: "estabilizar-core", media: "prancha",
    steps: ["Deite de costas com braços para cima e joelhos a 90°.", "Estenda um braço e a perna oposta devagar.", "Volte e alterne os lados."],
    posture: ["Lombar colada no chão o tempo todo.", "Movimento lento.", "Expire ao estender."],
  },
  {
    id: "pallof", name: "Pallof press", group: "core", equipment: "Polia", compound: false, pattern: "estabilizar-core", media: "abdominal-polia",
    steps: ["De lado para a polia na altura do peito, segure a alça junto ao peito.", "Estenda os braços à frente sem deixar o tronco girar.", "Volte devagar. Troque de lado."],
    posture: ["Quadril e ombros virados para frente.", "Abdômen firme.", "Pés na largura do quadril."],
  },
  {
    id: "bird-dog", name: "Perdigueiro (bird dog)", group: "core", equipment: "Colchonete", compound: false, pattern: "estabilizar-core", media: "prancha",
    steps: ["Em quatro apoios, mãos abaixo dos ombros e joelhos abaixo do quadril.", "Estenda um braço e a perna oposta.", "Volte e alterne os lados."],
    posture: ["Costas retas como uma mesa.", "Quadril sem girar.", "Movimento lento."],
  },
  // Abdômen — flexionar o tronco
  {
    id: "abdominal-crunch", name: "Abdominal crunch", group: "core", equipment: "Colchonete", compound: false, pattern: "flexionar-tronco", media: "prancha",
    steps: ["Deite de costas com os joelhos dobrados e as mãos ao lado da cabeça.", "Enrole o tronco tirando as escápulas do chão.", "Desça devagar."],
    posture: ["Não puxe o pescoço com as mãos.", "Lombar no chão.", "Expire ao subir."],
  },
  {
    id: "abdominal-maquina", name: "Abdominal na máquina", group: "core", equipment: "Máquina", compound: false, pattern: "flexionar-tronco", media: "abdominal-polia",
    steps: ["Sente e segure as alças ou apoie o peito na almofada.", "Enrole o tronco à frente contraindo o abdômen.", "Volte devagar."],
    posture: ["O movimento vem do abdômen, não dos braços.", "Quadril parado.", "Expire ao descer o tronco."],
  },
  {
    id: "abdominal-reverso", name: "Abdominal reverso", group: "core", equipment: "Colchonete", compound: false, pattern: "flexionar-tronco", media: "prancha",
    steps: ["Deite de costas com os joelhos dobrados e as pernas no ar.", "Leve os joelhos em direção ao peito tirando o quadril do chão.", "Desça devagar."],
    posture: ["Braços no chão para apoio.", "Sem balançar as pernas.", "Lombar volta ao chão com controle."],
  },
  // ——— Ampliação de 05/10/2026: grupos novos e movimentos que faltavam nos métodos ———
  // Panturrilha
  {
    id: "panturrilha-em-pe", name: "Panturrilha em pé na máquina", group: "panturrilha", equipment: "Máquina", compound: false, pattern: "flexionar-plantar", media: "leg-press",
    steps: ["Apoie os ombros nas almofadas e a ponta dos pés na plataforma.", "Suba o calcanhar o mais alto que conseguir.", "Desça devagar até alongar bem a panturrilha."],
    posture: ["Joelhos estendidos, sem travar.", "Pausa de 1 s no topo.", "Amplitude completa vale mais que carga."],
  },
  {
    id: "panturrilha-sentado", name: "Panturrilha sentado (gêmeos sentado)", group: "panturrilha", equipment: "Máquina", compound: false, pattern: "flexionar-plantar", media: "leg-press",
    steps: ["Sente com a almofada sobre as coxas, perto dos joelhos.", "Com a ponta dos pés na plataforma, suba os calcanhares.", "Desça devagar até alongar."],
    posture: ["Joelhos a 90°.", "Sem quicar embaixo.", "Trabalha mais o sóleo, a parte de baixo da panturrilha."],
  },
  {
    id: "panturrilha-leg-press", name: "Panturrilha no leg press", group: "panturrilha", equipment: "Máquina", compound: false, pattern: "flexionar-plantar", media: "leg-press",
    steps: ["Sente no leg press e apoie só a ponta dos pés na borda de baixo da plataforma.", "Empurre a plataforma esticando os tornozelos.", "Volte devagar até alongar a panturrilha."],
    posture: ["Joelhos estendidos, sem travar.", "Mantenha as travas de segurança fechadas.", "Movimento só no tornozelo."],
  },
  {
    id: "panturrilha-halter", name: "Panturrilha em pé com halter", group: "panturrilha", equipment: "Halter e degrau", compound: false, pattern: "flexionar-plantar", media: "leg-press",
    steps: ["Fique com a ponta de um pé num degrau, segurando um halter do mesmo lado.", "Suba o calcanhar o máximo possível.", "Desça abaixo do degrau e repita; depois troque o lado."],
    posture: ["Apoie a outra mão para equilíbrio.", "Joelho levemente dobrado.", "Desça devagar, sem quicar."],
  },
  {
    id: "panturrilha-smith", name: "Panturrilha no Smith", group: "panturrilha", equipment: "Máquina Smith e step", compound: false, pattern: "flexionar-plantar", media: "leg-press",
    steps: ["Fique com a ponta dos pés num step sob a barra apoiada nos ombros.", "Destrave a barra e suba os calcanhares.", "Desça até alongar e repita."],
    posture: ["Tronco ereto.", "Pés na largura do quadril.", "Trave a barra ao terminar."],
  },
  // Trapézio
  {
    id: "encolhimento-barra", name: "Encolhimento com barra", group: "trapezio", equipment: "Barra", compound: false, pattern: "encolher-ombros", media: "remada-curvada",
    steps: ["Em pé, segure a barra à frente das coxas com as mãos na largura dos ombros.", "Suba os ombros em direção às orelhas.", "Segure 1 s e desça devagar."],
    posture: ["Braços estendidos: não puxe com os cotovelos.", "Não gire os ombros.", "Pescoço neutro, olhando à frente."],
  },
  {
    id: "encolhimento-halteres", name: "Encolhimento com halteres", group: "trapezio", equipment: "Halteres", compound: false, pattern: "encolher-ombros", media: "remada-curvada",
    steps: ["Em pé, um halter em cada mão ao lado do corpo.", "Suba os ombros o mais alto possível.", "Desça devagar até alongar."],
    posture: ["Braços soltos e estendidos.", "Sem rolar os ombros.", "Abdômen firme."],
  },
  {
    id: "encolhimento-maquina", name: "Encolhimento na máquina", group: "trapezio", equipment: "Máquina", compound: false, pattern: "encolher-ombros", media: "remada-curvada",
    steps: ["Posicione-se na máquina segurando as alças.", "Suba os ombros em direção às orelhas.", "Desça controlando."],
    posture: ["Braços estendidos.", "Tronco ereto.", "Pausa curta no topo."],
  },
  {
    id: "remada-alta", name: "Remada alta com barra", group: "trapezio", equipment: "Barra", compound: true, pattern: "encolher-ombros", media: "remada-curvada",
    steps: ["Segure a barra à frente das coxas com as mãos um pouco mais fechadas que os ombros.", "Puxe a barra rente ao corpo até a altura do peito, cotovelos para cima.", "Desça devagar."],
    posture: ["Cotovelos sempre acima das mãos.", "Não passe da linha dos ombros se sentir dor.", "Tronco parado, sem embalo."],
  },
  {
    id: "remada-alta-polia", name: "Remada alta na polia", group: "trapezio", equipment: "Polia baixa", compound: true, pattern: "encolher-ombros", media: "remada-curvada",
    steps: ["De frente para a polia baixa, segure a barra reta.", "Puxe até a altura do peito com os cotovelos subindo.", "Volte devagar."],
    posture: ["Barra rente ao corpo.", "Ombros sem dor: limite a altura.", "Tronco firme."],
  },
  // Antebraço
  {
    id: "rosca-punho", name: "Rosca de punho com barra", group: "antebraco", equipment: "Barra e banco", compound: false, pattern: "punho", media: "rosca-direta",
    steps: ["Sente com os antebraços apoiados nas coxas ou no banco, palmas para cima.", "Deixe a barra descer até a ponta dos dedos.", "Feche a mão e suba o punho o máximo possível."],
    posture: ["Só o punho se move.", "Antebraços colados no apoio.", "Carga leve e muitas repetições."],
  },
  {
    id: "rosca-punho-inversa", name: "Rosca de punho inversa", group: "antebraco", equipment: "Barra e banco", compound: false, pattern: "punho", media: "rosca-direta",
    steps: ["Antebraços apoiados, palmas para baixo segurando a barra.", "Suba o dorso da mão o máximo possível.", "Desça devagar."],
    posture: ["Movimento curto e controlado.", "Use menos carga que na rosca de punho.", "Antebraços parados."],
  },
  {
    id: "rosca-inversa", name: "Rosca inversa com barra", group: "antebraco", equipment: "Barra", compound: false, pattern: "punho", media: "rosca-direta",
    steps: ["Em pé, segure a barra com as palmas para baixo.", "Dobre os cotovelos subindo a barra até o peito.", "Desça devagar."],
    posture: ["Cotovelos colados ao corpo.", "Punhos retos.", "Sem balançar o tronco."],
  },
  {
    id: "caminhada-fazendeiro", name: "Caminhada do fazendeiro", group: "antebraco", equipment: "Halteres ou kettlebells", compound: true, pattern: "carregar", media: "rosca-martelo",
    steps: ["Pegue um peso pesado em cada mão, ao lado do corpo.", "Caminhe a passos curtos e firmes pela distância ou tempo combinado.", "Pare, apoie os pesos no chão com a coluna reta."],
    posture: ["Peito aberto e ombros para trás.", "Abdômen firme, sem inclinar para os lados.", "Pegue e solte os pesos agachando."],
  },
  {
    id: "rolo-punho", name: "Rolo de punho", group: "antebraco", equipment: "Rolo com corda e anilha", compound: false, pattern: "punho", media: "rosca-direta",
    steps: ["Segure o rolo com os braços estendidos à frente.", "Gire os punhos enrolando a corda até a anilha subir.", "Desenrole devagar até descer."],
    posture: ["Braços na altura dos ombros.", "Ombros baixos.", "Gire alternando as mãos."],
  },
  // Condicionamento
  {
    id: "kettlebell-swing", name: "Swing com kettlebell", group: "cardio", equipment: "Kettlebell", compound: true, pattern: "cardio", media: "terra-romeno",
    steps: ["Pés um pouco além dos ombros, kettlebell entre as pernas.", "Leve o quadril para trás e projete-o à frente com força, balançando o peso até a altura do peito.", "Deixe o peso voltar entre as pernas e emende a próxima."],
    posture: ["A força vem do quadril, não dos braços.", "Coluna reta o tempo todo.", "Glúteos contraídos no topo."],
  },
  {
    id: "mountain-climber", name: "Escalador (mountain climber)", group: "cardio", equipment: "Peso corporal", compound: true, pattern: "cardio", media: "prancha",
    steps: ["Fique em posição de prancha alta, mãos sob os ombros.", "Leve um joelho em direção ao peito.", "Troque as pernas rapidamente, como se corresse no lugar."],
    posture: ["Quadril alinhado, sem subir.", "Ombros sobre as mãos.", "Ritmo constante e respiração solta."],
  },
  {
    id: "salto-estrela", name: "Salto estrela (polichinelo)", group: "cardio", equipment: "Peso corporal", compound: true, pattern: "cardio", media: "agachamento",
    steps: ["Agache um pouco com os braços junto ao corpo.", "Salte abrindo braços e pernas em X.", "Aterrisse com os pés juntos e emende o próximo."],
    posture: ["Aterrisse na ponta dos pés, joelhos macios.", "Abdômen firme.", "Para facilitar, faça o polichinelo comum."],
  },
  {
    id: "salto-caixa", name: "Salto na caixa", group: "cardio", equipment: "Caixa de salto", compound: true, pattern: "cardio", media: "agachamento",
    steps: ["Fique de frente para a caixa, pés na largura do quadril.", "Balance os braços e salte com os dois pés para cima da caixa.", "Fique em pé no topo e desça andando, um pé de cada vez."],
    posture: ["Aterrisse com os joelhos alinhados aos pés.", "Comece com uma caixa baixa.", "Desça andando, não pulando."],
  },
  {
    id: "corda-naval", name: "Corda naval", group: "cardio", equipment: "Corda naval", compound: true, pattern: "cardio", media: "agachamento",
    steps: ["Segure uma ponta da corda em cada mão, em semiagachamento.", "Faça ondas alternando os braços rapidamente.", "Mantenha o ritmo pelo tempo da série."],
    posture: ["Joelhos dobrados e tronco firme.", "Movimento vem dos ombros.", "Respire durante todo o tempo."],
  },
  {
    id: "pular-corda", name: "Pular corda", group: "cardio", equipment: "Corda", compound: true, pattern: "cardio", media: "agachamento",
    steps: ["Segure a corda com os cotovelos perto do corpo.", "Gire a corda com os punhos e salte baixo a cada volta.", "Mantenha o ritmo pelo tempo da série."],
    posture: ["Saltos baixos, na ponta dos pés.", "Joelhos levemente dobrados.", "Os punhos giram, não os braços."],
  },
  {
    id: "agachamento-salto", name: "Agachamento com salto", group: "cardio", equipment: "Peso corporal", compound: true, pattern: "cardio", media: "agachamento",
    steps: ["Agache até as coxas ficarem perto da paralela.", "Salte o mais alto possível estendendo o corpo.", "Aterrisse macio já descendo para o próximo agachamento."],
    posture: ["Joelhos alinhados com os pés.", "Peito aberto.", "Aterrisse sem fazer barulho."],
  },
  {
    id: "thruster-kettlebell", name: "Thruster com kettlebell", group: "cardio", equipment: "Kettlebell", compound: true, pattern: "cardio", media: "agachamento",
    steps: ["Segure o kettlebell na altura dos ombros.", "Agache e, ao subir, empurre o peso acima da cabeça num movimento só.", "Traga o peso de volta aos ombros e repita."],
    posture: ["Use o impulso das pernas para subir o peso.", "Coluna reta no agachamento.", "Braço estendido acima da cabeça, sem arquear a lombar."],
  },
  {
    id: "remo-ergometro", name: "Remo ergômetro", group: "cardio", equipment: "Remo ergômetro", compound: true, pattern: "cardio", media: "remada-baixa",
    steps: ["Prenda os pés e segure o puxador com os braços estendidos.", "Empurre com as pernas, incline o tronco para trás e puxe o puxador até o abdômen.", "Volte na ordem inversa: braços, tronco e pernas."],
    posture: ["Pernas fazem a maior parte da força.", "Coluna reta, sem curvar.", "Ritmo forte e constante."],
  },
  {
    id: "empurrar-treno", name: "Empurrar trenó", group: "cardio", equipment: "Trenó", compound: true, pattern: "cardio", media: "leg-press",
    steps: ["Segure as barras do trenó com o corpo inclinado à frente.", "Empurre com passos curtos e fortes.", "Siga até o fim da distância."],
    posture: ["Braços firmes, quase estendidos.", "Corpo em linha reta da cabeça aos pés.", "Empurre com as pernas."],
  },
  {
    id: "bicicleta-ergometrica", name: "Bicicleta ergométrica (tiro)", group: "cardio", equipment: "Bicicleta ergométrica", compound: true, pattern: "cardio", media: "leg-press",
    steps: ["Ajuste o banco para o joelho ficar quase estendido embaixo.", "Pedale forte pelo tempo da série.", "Reduza no descanso sem parar de pedalar."],
    posture: ["Tronco estável.", "Aumente a carga em vez de só girar rápido.", "Respire no ritmo."],
  },
  {
    id: "esteira-corrida", name: "Corrida na esteira (tiro)", group: "cardio", equipment: "Esteira", compound: true, pattern: "cardio", media: "afundo",
    steps: ["Aqueça caminhando e suba a velocidade.", "Corra forte pelo tempo da série.", "Volte a caminhar no descanso."],
    posture: ["Passadas curtas, pisando embaixo do corpo.", "Não segure nas barras.", "Use a chave de segurança presa à roupa."],
  },
  {
    id: "eliptico", name: "Elíptico (tiro)", group: "cardio", equipment: "Elíptico", compound: true, pattern: "cardio", media: "afundo",
    steps: ["Suba no aparelho e segure as alças.", "Pedale forte empurrando e puxando as alças.", "Diminua o ritmo no descanso."],
    posture: ["Tronco ereto.", "Pés inteiros nos pedais.", "Braços e pernas trabalham juntos."],
  },
  // Posterior e glúteos
  {
    id: "terra-convencional", name: "Levantamento terra", group: "posterior", equipment: "Barra", compound: true, pattern: "dobrar-quadril", media: "terra-romeno",
    steps: ["Pés na largura do quadril, barra sobre o meio do pé.", "Agache e segure a barra por fora das pernas, peito aberto.", "Empurre o chão e estenda quadril e joelhos juntos até ficar em pé; desça a barra rente às pernas."],
    posture: ["Coluna neutra do início ao fim.", "Barra sempre encostada nas pernas.", "Abdômen firme antes de puxar."],
  },
  {
    id: "terra-sumo", name: "Levantamento terra sumô", group: "posterior", equipment: "Barra", compound: true, pattern: "dobrar-quadril", media: "terra-romeno",
    steps: ["Pés bem afastados, pontas para fora, barra sobre o meio do pé.", "Segure a barra por dentro das pernas, peito aberto.", "Empurre o chão afastando os joelhos e suba até ficar em pé."],
    posture: ["Joelhos na direção das pontas dos pés.", "Coluna neutra.", "Tronco mais vertical que no terra comum."],
  },
  {
    id: "terra-hexagonal", name: "Levantamento terra com barra hexagonal", group: "posterior", equipment: "Barra hexagonal (trap bar)", compound: true, pattern: "dobrar-quadril", media: "terra-romeno",
    steps: ["Fique dentro da barra e segure as alças laterais.", "Com o peito aberto, empurre o chão até ficar em pé.", "Desça controlando até os pesos tocarem o chão."],
    posture: ["Coluna neutra.", "Quadril e joelhos sobem juntos.", "Variação mais fácil para a lombar."],
  },
  {
    id: "bom-dia", name: "Bom-dia com barra", group: "posterior", equipment: "Barra e rack", compound: true, pattern: "dobrar-quadril", media: "terra-romeno",
    steps: ["Apoie a barra nas costas como no agachamento.", "Com os joelhos levemente dobrados, leve o quadril para trás inclinando o tronco.", "Volte contraindo glúteos e posteriores."],
    posture: ["Coluna neutra sempre.", "Desça só até sentir o posterior alongar.", "Use carga leve."],
  },
  {
    id: "abdutora", name: "Cadeira abdutora", group: "posterior", equipment: "Máquina", compound: false, pattern: "estender-quadril", media: "hip-thrust",
    steps: ["Sente com as almofadas por fora dos joelhos.", "Afaste as pernas o máximo possível.", "Volte devagar sem deixar os pesos baterem."],
    posture: ["Costas apoiadas.", "Movimento controlado nos dois sentidos.", "Trabalha o glúteo médio."],
  },
  // Quadríceps
  {
    id: "adutora", name: "Cadeira adutora", group: "quadriceps", equipment: "Máquina", compound: false, pattern: "estender-joelho", media: "extensora",
    steps: ["Sente com as almofadas por dentro dos joelhos.", "Feche as pernas apertando as almofadas.", "Abra devagar até o limite confortável."],
    posture: ["Costas apoiadas.", "Sem tranco na volta.", "Trabalha a parte interna da coxa."],
  },
  {
    id: "agachamento-frontal", name: "Agachamento frontal", group: "quadriceps", equipment: "Barra e rack", compound: true, pattern: "agachar", media: "agachamento",
    steps: ["Apoie a barra na frente dos ombros com os cotovelos altos.", "Agache mantendo o tronco o mais vertical possível.", "Suba empurrando o chão."],
    posture: ["Cotovelos sempre apontando à frente.", "Joelhos na direção dos pés.", "Coluna neutra."],
  },
  {
    id: "afundo-caminhando", name: "Afundo caminhando", group: "quadriceps", equipment: "Peso corporal ou halteres", compound: true, pattern: "unilateral-joelho", media: "afundo",
    steps: ["Dê um passo largo à frente e desça até os dois joelhos ficarem a ~90°.", "Empurre com a perna da frente e traga a de trás para o próximo passo.", "Siga alternando as pernas."],
    posture: ["Tronco ereto.", "Joelho da frente alinhado com o pé.", "Joelho de trás perto do chão, sem bater."],
  },
  // Peito
  {
    id: "mergulho-paralelas", name: "Mergulho nas paralelas (peito)", group: "peito", equipment: "Barras paralelas", compound: true, pattern: "empurrar-horizontal", media: "flexao",
    steps: ["Apoie-se nas paralelas com os braços estendidos.", "Incline o tronco à frente e desça até os ombros ficarem um pouco abaixo dos cotovelos.", "Empurre de volta para cima."],
    posture: ["Tronco inclinado à frente foca o peito.", "Ombros baixos, longe das orelhas.", "Use o gravitron se ainda não consegue o peso do corpo."],
  },
  {
    id: "supino-declinado", name: "Supino declinado com barra", group: "peito", equipment: "Barra e banco declinado", compound: true, pattern: "empurrar-horizontal", media: "supino-reto",
    steps: ["Deite no banco declinado com as pernas presas.", "Desça a barra até a parte de baixo do peito.", "Empurre até estender os braços."],
    posture: ["Escápulas juntas.", "Punhos sobre os cotovelos.", "Peça ajuda para tirar e devolver a barra."],
  },
  {
    id: "pullover-halter", name: "Pullover com halter", group: "peito", equipment: "Halter e banco", compound: false, pattern: "aduzir-ombro", media: "supino-inclinado",
    steps: ["Deite no banco segurando um halter com as duas mãos acima do peito.", "Leve o halter para trás da cabeça com os braços quase estendidos.", "Volte à posição inicial."],
    posture: ["Cotovelos levemente dobrados e fixos.", "Desça só até sentir alongar, sem dor no ombro.", "Abdômen firme, lombar no banco."],
  },
  // Tríceps
  {
    id: "mergulho-triceps", name: "Mergulho nas paralelas (tríceps)", group: "triceps", equipment: "Barras paralelas", compound: true, pattern: "estender-cotovelo", media: "triceps-frances",
    steps: ["Apoie-se nas paralelas com os braços estendidos e o tronco reto.", "Desça dobrando os cotovelos para trás.", "Empurre até estender os braços."],
    posture: ["Tronco vertical foca o tríceps.", "Cotovelos apontando para trás.", "Desça até ~90° no cotovelo."],
  },
  {
    id: "mergulho-banco", name: "Mergulho no banco", group: "triceps", equipment: "Banco", compound: true, pattern: "estender-cotovelo", media: "triceps-frances",
    steps: ["Apoie as mãos na borda do banco atrás de você, pernas à frente.", "Desça o quadril dobrando os cotovelos.", "Empurre até estender os braços."],
    posture: ["Costas perto do banco.", "Cotovelos para trás, não para os lados.", "Joelhos dobrados facilitam."],
  },
  {
    id: "supino-fechado", name: "Supino fechado", group: "triceps", equipment: "Barra e banco", compound: true, pattern: "estender-cotovelo", media: "supino-reto",
    steps: ["Deite no banco e segure a barra com as mãos na largura dos ombros.", "Desça a barra até a parte de baixo do peito, cotovelos colados.", "Empurre até estender os braços."],
    posture: ["Cotovelos junto ao corpo.", "Punhos retos.", "Não feche demais a pegada."],
  },
  // Costas
  {
    id: "barra-supinada", name: "Barra fixa supinada (chin-up)", group: "costas", equipment: "Barra fixa", compound: true, pattern: "puxar-vertical", media: "barra-fixa",
    steps: ["Segure a barra com as palmas viradas para você, na largura dos ombros.", "Puxe até o queixo passar da barra.", "Desça devagar até estender os braços."],
    posture: ["Peito em direção à barra.", "Sem balançar as pernas.", "Use elástico ou gravitron se precisar."],
  },
  {
    id: "remada-curvada-halteres", name: "Remada curvada com halteres", group: "costas", equipment: "Halteres", compound: true, pattern: "puxar-horizontal", media: "remada-curvada",
    steps: ["Incline o tronco à frente com um halter em cada mão.", "Puxe os halteres até a lateral do abdômen.", "Desça devagar."],
    posture: ["Coluna neutra.", "Cotovelos rentes ao corpo.", "Junte as escápulas no topo."],
  },
  // Bíceps
  {
    id: "rosca-spider", name: "Rosca spider", group: "biceps", equipment: "Barra W e banco inclinado", compound: false, pattern: "flexionar-cotovelo", media: "rosca-direta",
    steps: ["Deite de bruços no banco inclinado com os braços pendurados.", "Suba a barra dobrando os cotovelos.", "Desça devagar até estender."],
    posture: ["Braços perpendiculares ao chão.", "Cotovelos parados.", "Pausa no topo."],
  },
  {
    id: "rosca-zottman", name: "Rosca Zottman", group: "biceps", equipment: "Halteres", compound: false, pattern: "flexionar-cotovelo", media: "rosca-direta",
    steps: ["Suba os halteres com as palmas para cima.", "No topo, gire as palmas para baixo.", "Desça devagar assim e gire de volta embaixo."],
    posture: ["Cotovelos colados ao corpo.", "Descida lenta.", "Trabalha bíceps e antebraço."],
  },
  {
    id: "rosca-martelo-inclinada", name: "Rosca martelo no banco inclinado", group: "biceps", equipment: "Halteres e banco", compound: false, pattern: "flexionar-cotovelo", media: "rosca-martelo",
    steps: ["Sente no banco inclinado com os braços pendurados, palmas viradas uma para a outra.", "Suba os halteres sem girar os punhos.", "Desça devagar."],
    posture: ["Costas apoiadas.", "Cotovelos parados.", "Amplitude completa."],
  },
  // Ombros
  {
    id: "elevacao-frontal", name: "Elevação frontal com halteres", group: "ombros", equipment: "Halteres", compound: false, pattern: "abduzir-ombro", media: "elevacao-lateral",
    steps: ["Em pé, halteres à frente das coxas.", "Suba os braços à frente até a altura dos ombros.", "Desça devagar."],
    posture: ["Cotovelos levemente dobrados.", "Sem jogar o tronco para trás.", "Pode alternar os braços."],
  },
  {
    id: "elevacao-frontal-anilha", name: "Elevação frontal com anilha", group: "ombros", equipment: "Anilha", compound: false, pattern: "abduzir-ombro", media: "elevacao-lateral",
    steps: ["Segure uma anilha com as duas mãos à frente do corpo.", "Suba a anilha até a altura dos olhos.", "Desça devagar."],
    posture: ["Braços quase estendidos.", "Abdômen firme.", "Sem embalo."],
  },
  // Abdômen
  {
    id: "abdominal-bicicleta", name: "Abdominal bicicleta", group: "core", equipment: "Colchonete", compound: false, pattern: "flexionar-tronco", media: "abdominal-polia",
    steps: ["Deite de costas com as mãos ao lado da cabeça e as pernas no ar.", "Leve o cotovelo em direção ao joelho oposto, esticando a outra perna.", "Alterne os lados num ritmo contínuo."],
    posture: ["Não puxe a cabeça com as mãos.", "Lombar no chão.", "Gire o tronco, não só o cotovelo."],
  },
  {
    id: "rodinha-abdominal", name: "Rodinha abdominal", group: "core", equipment: "Rodinha", compound: false, pattern: "estabilizar-core", media: "prancha",
    steps: ["De joelhos, segure a rodinha à frente dos joelhos.", "Role à frente estendendo o corpo até onde conseguir sem arquear a lombar.", "Volte puxando com o abdômen."],
    posture: ["Abdômen e glúteos contraídos.", "Lombar nunca afunda.", "Aumente a distância aos poucos."],
  },
  {
    id: "elevacao-pernas-suspenso", name: "Elevação de pernas suspenso", group: "core", equipment: "Barra fixa", compound: false, pattern: "flexionar-tronco", media: "abdominal-polia",
    steps: ["Pendure-se na barra com os braços estendidos.", "Suba as pernas até a altura do quadril ou mais.", "Desça devagar sem balançar."],
    posture: ["Sem embalo.", "Enrole o quadril no topo.", "Dobre os joelhos para facilitar."],
  },
  {
    id: "russian-twist", name: "Rotação russa (russian twist)", group: "core", equipment: "Colchonete e anilha", compound: false, pattern: "flexionar-tronco", media: "abdominal-polia",
    steps: ["Sente com os joelhos dobrados e o tronco inclinado para trás.", "Gire o tronco levando as mãos (ou um peso) de um lado ao outro.", "Siga alternando."],
    posture: ["Coluna reta, sem curvar.", "Gire o tronco, não só os braços.", "Pés no chão para facilitar."],
  },
  {
    id: "abdominal-obliquo", name: "Abdominal oblíquo", group: "core", equipment: "Colchonete", compound: false, pattern: "flexionar-tronco", media: "abdominal-polia",
    steps: ["Deite de costas com os joelhos dobrados caídos para um lado.", "Suba o tronco contraindo a lateral do abdômen.", "Desça devagar; depois troque o lado."],
    posture: ["Mãos ao lado da cabeça, sem puxar.", "Movimento curto.", "Expire ao subir."],
  },
  {
    id: "elevacao-pernas-banco", name: "Elevação de pernas no banco", group: "core", equipment: "Banco", compound: false, pattern: "flexionar-tronco", media: "abdominal-polia",
    steps: ["Deite no banco segurando a borda atrás da cabeça.", "Suba as pernas estendidas até ficarem verticais.", "Desça devagar sem encostar."],
    posture: ["Lombar colada no banco.", "Joelhos levemente dobrados se precisar.", "Sem embalo."],
  },  // Membros superiores ampliados em 2026-11-01 (academia completa).
  // Peito
  {
    id: "supino-inclinado-smith", name: "Supino inclinado no Smith", group: "peito", equipment: "Máquina Smith e banco", compound: true, pattern: "empurrar-horizontal", media: "supino-reto",
    steps: ["Ajuste o banco a 30°–45° com a barra alinhada à parte de cima do peito.", "Destrave a barra com as mãos um pouco além da largura dos ombros.", "Desça controlando até perto do peito.", "Empurre de volta até estender os braços."],
    posture: ["Escápulas juntas e para baixo.", "Cotovelos a ~45° do corpo.", "Trave a barra nos ganchos ao terminar."],
  },
  {
    id: "supino-inclinado-maquina", name: "Supino inclinado na máquina", group: "peito", equipment: "Máquina", compound: true, pattern: "empurrar-horizontal", media: "supino-inclinado",
    steps: ["Ajuste o banco para as alças ficarem na altura da parte de cima do peito.", "Empurre as alças para frente e para cima até quase estender os braços.", "Volte devagar até sentir alongar o peito."],
    posture: ["Costas e cabeça apoiadas no encosto.", "Ombros baixos, longe das orelhas.", "Não trave os cotovelos no fim."],
  },
  {
    id: "supino-declinado-halteres", name: "Supino declinado com halteres", group: "peito", equipment: "Halteres e banco declinado", compound: true, pattern: "empurrar-horizontal", media: "supino-inclinado",
    steps: ["Prenda as pernas no banco declinado com um halter em cada mão sobre o peito.", "Desça os halteres até a linha da parte de baixo do peito.", "Empurre de volta aproximando os halteres no topo."],
    posture: ["Escápulas encaixadas no banco.", "Cotovelos a ~45° do corpo.", "Para sair, sente primeiro com os halteres no colo."],
  },
  {
    id: "supino-pegada-neutra", name: "Supino com halteres pegada neutra", group: "peito", equipment: "Halteres e banco", compound: true, pattern: "empurrar-horizontal", media: "supino-inclinado",
    steps: ["Deite no banco reto com as palmas das mãos viradas uma para a outra.", "Empurre os halteres para cima mantendo as palmas assim.", "Desça devagar com os cotovelos perto do corpo."],
    posture: ["Cotovelos junto ao tronco: costuma poupar os ombros.", "Pés firmes no chão.", "Punhos retos."],
  },
  {
    id: "crossover-baixo", name: "Crossover de baixo para cima", group: "peito", equipment: "Polia baixa", compound: false, pattern: "aduzir-ombro", media: "peck-deck",
    steps: ["Entre as polias baixas, segure uma alça em cada mão.", "Com os cotovelos levemente flexionados, leve as mãos para cima e para frente até se encontrarem na altura do peito.", "Volte devagar até sentir alongar o peito."],
    posture: ["Peito aberto e tronco firme.", "Cotovelos sempre na mesma flexão.", "Foca a parte de cima do peito."],
  },
  {
    id: "crucifixo-inclinado-cabo", name: "Crucifixo inclinado na polia", group: "peito", equipment: "Polia baixa e banco", compound: false, pattern: "aduzir-ombro", media: "peck-deck",
    steps: ["Coloque um banco inclinado entre as polias baixas e deite segurando as alças.", "Com os cotovelos levemente flexionados, junte as mãos acima do peito.", "Abra os braços devagar até a altura do banco."],
    posture: ["Escápulas juntas no banco.", "Não desça além do alongamento confortável.", "O cabo mantém tensão o tempo todo."],
  },
  {
    id: "supino-cabo", name: "Supino em pé na polia", group: "peito", equipment: "Polia média", compound: true, pattern: "empurrar-horizontal", media: "supino-reto",
    steps: ["De costas para as polias, alças na altura do peito, um pé à frente.", "Empurre as alças para frente até estender os braços.", "Volte devagar até as mãos ficarem ao lado do peito."],
    posture: ["Abdômen firme, tronco levemente inclinado à frente.", "Não deixe as costas arquearem.", "Mãos se aproximam no fim do movimento."],
  },
  {
    id: "crucifixo-declinado", name: "Crucifixo declinado com halteres", group: "peito", equipment: "Halteres e banco declinado", compound: false, pattern: "aduzir-ombro", media: "peck-deck",
    steps: ["Prenda as pernas no banco declinado com os halteres acima do peito.", "Com os cotovelos levemente flexionados, abra os braços para os lados.", "Volte juntando os halteres acima do peito."],
    posture: ["Cotovelos sempre na mesma flexão.", "Desça até sentir alongar, sem forçar o ombro.", "Use pouca carga."],
  },
  // Costas
  {
    id: "puxada-fechada", name: "Puxada fechada pronada", group: "costas", equipment: "Polia alta", compound: true, pattern: "puxar-vertical", media: "puxada",
    steps: ["Segure a barra com as mãos na largura dos ombros, palmas para frente.", "Puxe a barra até a parte de cima do peito.", "Suba devagar até estender os braços."],
    posture: ["Peito para cima, leve inclinação para trás.", "Leve os cotovelos para baixo e para trás.", "Sem balançar o tronco."],
  },
  {
    id: "puxada-unilateral", name: "Puxada unilateral na polia", group: "costas", equipment: "Polia alta com alça", compound: true, pattern: "puxar-vertical", media: "puxada",
    steps: ["Sente na puxada segurando a alça com uma mão.", "Puxe a alça até o lado do peito levando o cotovelo para baixo.", "Suba devagar até alongar a lateral das costas. Troque de lado."],
    posture: ["Tronco parado, sem girar.", "Ombro baixo no fim da puxada.", "Comece pelo lado mais fraco."],
  },
  {
    id: "pulldown-corda", name: "Pulldown com corda", group: "costas", equipment: "Polia alta com corda", compound: false, pattern: "puxar-vertical", media: "puxada",
    steps: ["De frente para a polia alta, segure a corda com os braços estendidos.", "Incline o tronco um pouco à frente.", "Leve a corda até as coxas sem dobrar os cotovelos.", "Volte devagar até a altura dos olhos."],
    posture: ["Braços quase retos o tempo todo.", "Abdômen firme, costas retas.", "Abra a corda no fim do movimento."],
  },
  {
    id: "remada-alta-maquina", name: "Remada alta na máquina (high row)", group: "costas", equipment: "Máquina", compound: true, pattern: "puxar-vertical", media: "remada-baixa",
    steps: ["Sente com o peito no apoio e segure as alças acima da cabeça.", "Puxe as alças para baixo e para trás em direção ao quadril.", "Volte devagar até alongar as costas."],
    posture: ["Peito colado no apoio.", "Cotovelos descem perto do corpo.", "Junte as escápulas no fim."],
  },
  {
    id: "remada-cavalinho-apoiada", name: "Remada cavalinho com apoio no peito", group: "costas", equipment: "Máquina de remada T com apoio", compound: true, pattern: "puxar-horizontal", media: "remada-curvada",
    steps: ["Deite de bruços no apoio e segure as alças.", "Puxe as alças até o peito levando os cotovelos para trás.", "Desça devagar até estender os braços."],
    posture: ["Peito colado no apoio: a lombar descansa.", "Junte as escápulas no topo.", "Sem tirar o peito do apoio para roubar."],
  },
  {
    id: "remada-apoiada-halteres", name: "Remada com halteres no banco inclinado", group: "costas", equipment: "Halteres e banco", compound: true, pattern: "puxar-horizontal", media: "remada-curvada",
    steps: ["Deite de bruços num banco a ~30° com um halter em cada mão.", "Puxe os halteres em direção ao quadril.", "Desça devagar até estender os braços."],
    posture: ["Peito apoiado o tempo todo.", "Cotovelos perto do corpo.", "Junte as escápulas no topo."],
  },
  {
    id: "remada-landmine", name: "Remada unilateral na barra landmine", group: "costas", equipment: "Barra no landmine", compound: true, pattern: "puxar-horizontal", media: "remada-curvada",
    steps: ["Com a ponta da barra presa no canto ou no landmine, fique ao lado dela com o tronco inclinado.", "Segure a barra perto das anilhas com uma mão.", "Puxe até o lado do quadril e desça devagar. Troque de lado."],
    posture: ["Coluna neutra, joelhos levemente dobrados.", "Mão livre apoiada na coxa.", "Sem girar o tronco para puxar."],
  },
  {
    id: "remada-curvada-supinada", name: "Remada curvada supinada", group: "costas", equipment: "Barra", compound: true, pattern: "puxar-horizontal", media: "remada-curvada",
    steps: ["Segure a barra com as palmas para cima, na largura dos ombros.", "Incline o tronco a ~45° com os joelhos levemente dobrados.", "Puxe a barra até a parte de baixo do abdômen.", "Desça devagar."],
    posture: ["Coluna neutra do início ao fim.", "Cotovelos perto do corpo.", "Trabalha mais a parte de baixo das costas e o bíceps."],
  },
  {
    id: "remada-unilateral-cabo", name: "Remada unilateral sentado no cabo", group: "costas", equipment: "Polia baixa com alça", compound: true, pattern: "puxar-horizontal", media: "remada-baixa",
    steps: ["Sente na remada baixa segurando a alça com uma mão.", "Puxe a alça até o lado do abdômen levando o cotovelo para trás.", "Volte devagar estendendo o braço. Troque de lado."],
    posture: ["Tronco ereto, sem girar.", "Ombro para trás e para baixo no fim.", "Joelhos levemente dobrados."],
  },
  {
    id: "remada-smith", name: "Remada curvada no Smith", group: "costas", equipment: "Máquina Smith", compound: true, pattern: "puxar-horizontal", media: "remada-curvada",
    steps: ["Com a barra do Smith na altura dos joelhos, segure pronado na largura dos ombros.", "Incline o tronco a ~45° com os joelhos levemente dobrados.", "Puxe a barra até o abdômen e desça devagar."],
    posture: ["Coluna neutra.", "A barra guiada deixa focar só nas costas.", "Junte as escápulas no topo."],
  },
  // Ombros
  {
    id: "desenvolvimento-barra-sentado", name: "Desenvolvimento sentado com barra", group: "ombros", equipment: "Barra e banco", compound: true, pattern: "empurrar-vertical", media: "desenvolvimento",
    steps: ["Sente num banco com encosto e a barra na altura da parte de cima do peito.", "Empurre a barra para cima passando rente ao rosto.", "Desça até a altura do queixo."],
    posture: ["Costas apoiadas, abdômen firme.", "Não arqueie a lombar.", "Cotovelos levemente à frente da barra."],
  },
  {
    id: "desenvolvimento-unilateral", name: "Desenvolvimento unilateral com halter", group: "ombros", equipment: "Halter", compound: true, pattern: "empurrar-vertical", media: "desenvolvimento",
    steps: ["Em pé, segure um halter na altura do ombro.", "Empurre para cima até estender o braço.", "Desça devagar até o ombro. Troque de lado."],
    posture: ["Tronco reto, sem inclinar para o lado.", "Abdômen e glúteos contraídos.", "Mão livre na cintura."],
  },
  {
    id: "elevacao-lateral-inclinada", name: "Elevação lateral unilateral no banco inclinado", group: "ombros", equipment: "Halter e banco", compound: false, pattern: "abduzir-ombro", media: "elevacao-lateral",
    steps: ["Deite de lado num banco inclinado com o halter na mão de cima.", "Eleve o braço pela lateral até ficar acima do ombro.", "Desça devagar. Troque de lado."],
    posture: ["Cotovelo levemente flexionado.", "Movimento lento: a carga é pequena.", "Tronco firme no banco."],
  },
  {
    id: "elevacao-frontal-cabo", name: "Elevação frontal na polia", group: "ombros", equipment: "Polia baixa", compound: false, pattern: "abduzir-ombro", media: "elevacao-lateral",
    steps: ["De costas para a polia baixa, segure a alça entre as pernas.", "Eleve o braço estendido à frente até a altura dos olhos.", "Desça devagar. Troque de lado."],
    posture: ["Tronco parado, sem jogar o corpo.", "Cotovelo levemente flexionado.", "Ombro baixo."],
  },
  {
    id: "crucifixo-inverso-sentado", name: "Crucifixo inverso sentado com halteres", group: "ombros", equipment: "Halteres e banco", compound: false, pattern: "abrir-ombro-posterior", media: "face-pull",
    steps: ["Sente na ponta do banco e incline o tronco sobre as coxas, halteres atrás das pernas.", "Abra os braços para os lados até a altura dos ombros.", "Desça devagar."],
    posture: ["Peito perto das coxas.", "Cotovelos levemente flexionados.", "Use pouca carga e esprema as escápulas."],
  },
  {
    id: "remada-posterior-corda", name: "Remada para posterior de ombro na corda", group: "ombros", equipment: "Polia média com corda", compound: true, pattern: "abrir-ombro-posterior", media: "face-pull",
    steps: ["De frente para a polia na altura do peito, segure a corda com as palmas para baixo.", "Puxe a corda em direção ao pescoço abrindo os cotovelos para os lados.", "Volte devagar."],
    posture: ["Cotovelos na altura dos ombros.", "Tronco parado.", "Sinta o trabalho atrás do ombro, não nas costas."],
  },
  {
    id: "rotacao-externa-cabo", name: "Rotação externa na polia", group: "ombros", equipment: "Polia média", compound: false, pattern: "abrir-ombro-posterior", media: "face-pull",
    steps: ["De lado para a polia na altura do cotovelo, segure a alça com a mão mais distante.", "Com o cotovelo colado no corpo e dobrado a 90°, gire o antebraço para fora.", "Volte devagar. Troque de lado."],
    posture: ["Cotovelo não sai da lateral do corpo.", "Carga leve: trabalha os músculos que estabilizam o ombro.", "Movimento lento."],
  },
  {
    id: "elevacao-escapular", name: "Elevação em Y em pé (scaption)", group: "ombros", equipment: "Halteres", compound: false, pattern: "abduzir-ombro", media: "elevacao-lateral",
    steps: ["Em pé, halteres ao lado do corpo com os polegares para cima.", "Eleve os braços estendidos à frente e um pouco abertos, em V, até a altura dos ombros.", "Desça devagar."],
    posture: ["Braços a ~30° à frente da linha do corpo.", "Ombros baixos.", "Bom para ombros sensíveis à elevação lateral."],
  },
  {
    id: "landmine-press", name: "Desenvolvimento unilateral na landmine", group: "ombros", equipment: "Barra no landmine", compound: true, pattern: "empurrar-vertical", media: "desenvolvimento",
    steps: ["Com a ponta da barra presa no landmine, segure a outra ponta na altura do ombro.", "Empurre a barra para cima e para frente até estender o braço.", "Desça devagar. Troque de lado."],
    posture: ["Pés afastados, um à frente do outro.", "Abdômen firme, sem arquear.", "O arco do movimento costuma poupar o ombro."],
  },
  // Bíceps
  {
    id: "rosca-barra-w", name: "Rosca direta com barra W", group: "biceps", equipment: "Barra W", compound: false, pattern: "flexionar-cotovelo", media: "rosca-direta",
    steps: ["Em pé, segure a barra W na parte angulada, palmas para cima.", "Dobre os cotovelos subindo a barra até a altura do peito.", "Desça devagar até estender os braços."],
    posture: ["Cotovelos parados ao lado do corpo.", "Sem jogar o tronco para trás.", "A pegada angulada alivia os punhos."],
  },
  {
    id: "rosca-martelo-corda", name: "Rosca martelo na corda", group: "biceps", equipment: "Polia baixa com corda", compound: false, pattern: "flexionar-cotovelo", media: "rosca-martelo",
    steps: ["De frente para a polia baixa, segure a corda com as palmas viradas uma para a outra.", "Dobre os cotovelos subindo a corda até o peito.", "Desça devagar."],
    posture: ["Cotovelos colados no corpo.", "Punhos retos.", "Trabalha bíceps e antebraço juntos."],
  },
  {
    id: "rosca-scott-maquina", name: "Rosca Scott na máquina", group: "biceps", equipment: "Máquina", compound: false, pattern: "flexionar-cotovelo", media: "rosca-direta",
    steps: ["Sente com a parte de trás dos braços no apoio e segure as alças.", "Dobre os cotovelos subindo as alças.", "Desça devagar até quase estender os braços."],
    posture: ["Braços colados no apoio.", "Não estenda os cotovelos com tranco no fim.", "Ombros baixos."],
  },
  {
    id: "rosca-scott-halter", name: "Rosca Scott unilateral com halter", group: "biceps", equipment: "Halter e banco Scott", compound: false, pattern: "flexionar-cotovelo", media: "rosca-direta",
    steps: ["Apoie a parte de trás do braço no banco Scott com o halter na mão.", "Dobre o cotovelo subindo o halter.", "Desça devagar até quase estender. Troque de lado."],
    posture: ["Braço sempre colado no apoio.", "Desça controlando: a parte de baixo é a mais pesada.", "Punho reto."],
  },
  {
    id: "rosca-polia-alta", name: "Rosca na polia alta", group: "biceps", equipment: "Polias altas", compound: false, pattern: "flexionar-cotovelo", media: "rosca-direta",
    steps: ["Entre as polias altas, segure uma alça em cada mão com os braços abertos na altura dos ombros.", "Dobre os cotovelos trazendo as mãos em direção às orelhas.", "Volte devagar estendendo os braços."],
    posture: ["Braços parados na altura dos ombros.", "Só os antebraços se movem.", "Contraia o bíceps no fim."],
  },
  {
    id: "rosca-cruzada", name: "Rosca martelo cruzada", group: "biceps", equipment: "Halteres", compound: false, pattern: "flexionar-cotovelo", media: "rosca-martelo",
    steps: ["Em pé, halteres ao lado do corpo com as palmas viradas para dentro.", "Suba um halter em direção ao ombro oposto, cruzando à frente do peito.", "Desça devagar e alterne os braços."],
    posture: ["Cotovelo perto do corpo.", "Sem girar o tronco.", "Punho reto."],
  },
  {
    id: "rosca-arrastada", name: "Rosca arrastada (drag curl)", group: "biceps", equipment: "Barra", compound: false, pattern: "flexionar-cotovelo", media: "rosca-direta",
    steps: ["Segure a barra com as palmas para cima, na largura dos ombros.", "Suba a barra rente ao corpo levando os cotovelos para trás.", "Desça devagar pelo mesmo caminho."],
    posture: ["A barra raspa no corpo do início ao fim.", "Cotovelos vão para trás, não para frente.", "Use menos carga que na rosca direta."],
  },
  {
    id: "rosca-unilateral-cabo", name: "Rosca unilateral na polia baixa", group: "biceps", equipment: "Polia baixa com alça", compound: false, pattern: "flexionar-cotovelo", media: "rosca-direta",
    steps: ["De frente para a polia baixa, segure a alça com uma mão.", "Dobre o cotovelo subindo a alça até o ombro.", "Desça devagar. Troque de lado."],
    posture: ["Cotovelo parado ao lado do corpo.", "Tronco ereto.", "O cabo mantém tensão até em cima."],
  },
  // Tríceps
  {
    id: "triceps-barra-v", name: "Tríceps na polia com barra V", group: "triceps", equipment: "Polia alta com barra V", compound: false, pattern: "estender-cotovelo", media: "triceps-corda",
    steps: ["De frente para a polia alta, segure a barra V com as palmas para baixo.", "Com os cotovelos colados no corpo, empurre a barra até estender os braços.", "Volte devagar até os antebraços passarem da horizontal."],
    posture: ["Cotovelos parados.", "Tronco levemente inclinado à frente.", "Sem usar o peso do corpo."],
  },
  {
    id: "triceps-supinado", name: "Tríceps na polia pegada supinada", group: "triceps", equipment: "Polia alta com barra", compound: false, pattern: "estender-cotovelo", media: "triceps-corda",
    steps: ["Segure a barra da polia alta com as palmas para cima.", "Com os cotovelos colados no corpo, estenda os braços para baixo.", "Volte devagar."],
    posture: ["Cotovelos parados ao lado do corpo.", "Punhos retos.", "Use menos carga que na pegada pronada."],
  },
  {
    id: "triceps-unilateral-cabo", name: "Tríceps unilateral na polia", group: "triceps", equipment: "Polia alta com alça", compound: false, pattern: "estender-cotovelo", media: "triceps-corda",
    steps: ["De frente para a polia alta, segure a alça com uma mão.", "Com o cotovelo colado no corpo, estenda o braço para baixo.", "Volte devagar. Troque de lado."],
    posture: ["Cotovelo parado.", "Tronco estável, sem girar.", "Ajuda a igualar os dois lados."],
  },
  {
    id: "triceps-maquina", name: "Tríceps na máquina", group: "triceps", equipment: "Máquina", compound: false, pattern: "estender-cotovelo", media: "triceps-corda",
    steps: ["Sente e apoie a parte de trás dos braços no apoio.", "Estenda os cotovelos empurrando as alças.", "Volte devagar."],
    posture: ["Braços colados no apoio.", "Costas no encosto.", "Não deixe o peso bater no fim."],
  },
  {
    id: "mergulho-maquina", name: "Mergulho na máquina", group: "triceps", equipment: "Máquina", compound: true, pattern: "estender-cotovelo", media: "triceps-frances",
    steps: ["Sente na máquina e segure as alças ao lado do corpo.", "Empurre as alças para baixo até estender os braços.", "Suba devagar até os cotovelos dobrarem a ~90°."],
    posture: ["Tronco ereto e cotovelos perto do corpo.", "Ombros baixos.", "Alternativa ao mergulho nas paralelas com carga ajustável."],
  },
  {
    id: "triceps-testa-halteres", name: "Tríceps testa com halteres", group: "triceps", equipment: "Halteres e banco", compound: false, pattern: "estender-cotovelo", media: "triceps-frances",
    steps: ["Deite no banco com um halter em cada mão, braços estendidos acima do peito e palmas viradas uma para a outra.", "Dobre os cotovelos descendo os halteres ao lado da cabeça.", "Estenda os braços de volta."],
    posture: ["Cotovelos apontados para o teto, sem abrir.", "Só os antebraços se movem.", "Desça devagar."],
  },
  {
    id: "triceps-frances-barra", name: "Tríceps francês em pé com barra", group: "triceps", equipment: "Barra ou barra W", compound: false, pattern: "estender-cotovelo", media: "triceps-frances",
    steps: ["Em pé, segure a barra acima da cabeça com as mãos próximas.", "Dobre os cotovelos descendo a barra atrás da cabeça.", "Estenda os braços de volta."],
    posture: ["Cotovelos apontados para cima e perto da cabeça.", "Abdômen firme, sem arquear a lombar.", "Desça só até onde o ombro permitir."],
  },
  {
    id: "supino-fechado-smith", name: "Supino fechado no Smith", group: "triceps", equipment: "Máquina Smith e banco", compound: true, pattern: "estender-cotovelo", media: "supino-reto",
    steps: ["Deite no banco sob o Smith e segure a barra com as mãos na largura dos ombros.", "Destrave e desça a barra até a parte de baixo do peito.", "Empurre de volta estendendo os braços."],
    posture: ["Cotovelos perto do corpo.", "Punhos retos.", "Trave a barra nos ganchos ao terminar."],
  },
  // Trapézio
  {
    id: "encolhimento-cabo", name: "Encolhimento na polia", group: "trapezio", equipment: "Polia baixa com barra", compound: false, pattern: "encolher-ombros", media: "remada-curvada",
    steps: ["De frente para a polia baixa, segure a barra com os braços estendidos.", "Suba os ombros em direção às orelhas.", "Segure 1 segundo e desça devagar."],
    posture: ["Braços retos: o movimento é só dos ombros.", "Sem girar os ombros.", "Pescoço neutro."],
  },
  {
    id: "encolhimento-smith", name: "Encolhimento no Smith por trás", group: "trapezio", equipment: "Máquina Smith", compound: false, pattern: "encolher-ombros", media: "remada-curvada",
    steps: ["De costas para a barra do Smith, segure-a atrás do corpo com os braços estendidos.", "Suba os ombros em direção às orelhas.", "Segure 1 segundo e desça devagar."],
    posture: ["Peito aberto, ombros levemente para trás.", "Braços retos.", "Movimento curto e controlado."],
  },
  {
    id: "remada-alta-halteres", name: "Remada alta com halteres", group: "trapezio", equipment: "Halteres", compound: true, pattern: "encolher-ombros", media: "remada-curvada",
    steps: ["Em pé, halteres à frente das coxas com as palmas para você.", "Suba os halteres rente ao corpo levando os cotovelos para cima e para os lados.", "Pare na altura do peito e desça devagar."],
    posture: ["Cotovelos sempre acima das mãos.", "Não suba além da altura dos ombros.", "Os halteres deixam cada braço seguir seu caminho."],
  },
  // Antebraço
  {
    id: "rosca-punho-halteres", name: "Rosca de punho sentado com halteres", group: "antebraco", equipment: "Halteres e banco", compound: false, pattern: "punho", media: "rosca-direta",
    steps: ["Sente com os antebraços apoiados nas coxas, palmas para cima e punhos para fora dos joelhos.", "Dobre os punhos subindo os halteres.", "Desça devagar até alongar."],
    posture: ["Antebraços parados nas coxas.", "Movimento só do punho.", "Carga leve e muitas repetições."],
  },
  {
    id: "rosca-punho-cabo", name: "Rosca de punho na polia", group: "antebraco", equipment: "Polia baixa com barra", compound: false, pattern: "punho", media: "rosca-direta",
    steps: ["Sente de frente para a polia baixa com os antebraços nas coxas, palmas para cima.", "Dobre os punhos subindo a barra.", "Desça devagar até alongar."],
    posture: ["Antebraços apoiados.", "Movimento só do punho.", "O cabo mantém tensão em todo o movimento."],
  },
  {
    id: "rosca-inversa-halteres", name: "Rosca inversa com halteres", group: "antebraco", equipment: "Halteres", compound: false, pattern: "punho", media: "rosca-direta",
    steps: ["Em pé, segure os halteres com as palmas para trás.", "Dobre os cotovelos subindo os halteres até os ombros.", "Desça devagar."],
    posture: ["Cotovelos parados ao lado do corpo.", "Punhos retos, sem dobrar para baixo.", "Trabalha a parte de cima do antebraço."],
  },
];

export const EXERCISES: Exercise[] = [
  ...BASE,
  ...EXTRAS.map(({ media, ...e }) => ({ ...e, img: BASE.find((b) => b.id === media)!.img, mediaId: media, extra: true })),
];

export const byId = (id: string) => EXERCISES.find((e) => e.id === id)!;

/** YouTube search for the exercise; a search never breaks when a single video is removed. */
export const youtubeSearchUrl = (ex: Exercise) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${ex.name} execução correta`)}`;

// Patterns that train the same muscles in a similar way; anything else is never offered as a swap.
const SIMILAR: [Pattern, Pattern][] = [
  ["empurrar-horizontal", "aduzir-ombro"],
  ["puxar-vertical", "puxar-horizontal"],
  ["agachar", "unilateral-joelho"],
  ["agachar", "estender-joelho"],
  ["unilateral-joelho", "estender-joelho"],
  ["dobrar-quadril", "estender-quadril"],
  ["dobrar-quadril", "flexionar-joelho"],
  ["empurrar-vertical", "abduzir-ombro"],
  ["estabilizar-core", "flexionar-tronco"],
  ["punho", "carregar"],
];
const isSimilar = (a: Pattern, b: Pattern) => SIMILAR.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

/** Swap options for an exercise: same movement first, then a similar movement for the same muscles. */
export const alternatives = (id: string) => {
  const ex = byId(id);
  const byCloseness = (a: Exercise, b: Exercise) =>
    Number(b.equipment === ex.equipment) - Number(a.equipment === ex.equipment) ||
    Number(b.compound === ex.compound) - Number(a.compound === ex.compound) ||
    a.name.localeCompare(b.name, "pt-BR");
  const sameGroup = EXERCISES.filter((e) => e.group === ex.group && e.id !== id);
  return {
    same: sameGroup.filter((e) => e.pattern === ex.pattern).sort(byCloseness),
    similar: sameGroup.filter((e) => isSimilar(e.pattern, ex.pattern)).sort(byCloseness),
  };
};
