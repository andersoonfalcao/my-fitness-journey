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

export type Pattern =
  | "empurrar-horizontal" | "aduzir-ombro" | "empurrar-vertical" | "abduzir-ombro" | "abrir-ombro-posterior"
  | "puxar-horizontal" | "puxar-vertical" | "agachar" | "unilateral-joelho" | "estender-joelho"
  | "dobrar-quadril" | "flexionar-joelho" | "estender-quadril" | "flexionar-cotovelo" | "estender-cotovelo"
  | "estabilizar-core" | "flexionar-tronco";

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
