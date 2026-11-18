"""Ficha e plano da Clínica Vértice (cliente fictício), escritos como a IA faria seguindo o agente do robô 3.
Serve de regressão: o robô precisa validar e montar tudo a partir destes dois arquivos.
Uso: python motor2-execucao/exemplos/clinica-vertice/_escrever_ficha_plano.py
"""
import json
from pathlib import Path

AQUI = Path(__file__).parent
T = 'transcricao'


def gravar(nome, obj):
    (AQUI / nome).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


f = json.loads((AQUI / 'ficha-rascunho.json').read_text(encoding='utf-8'))
f.pop('gerado_em', None)
f['fatos']['selo'] = {'valor': '12 anos de referência em Rio Verde', 'fonte': T, 'citacao': 'A gente está há doze anos aqui em Rio Verde', 'status': 'confirmado'}
f['dores'] = [
    {'texto': 'Falta de vaga perto: pacientes viajavam até Goiânia para fazer o exame', 'fonte': T, 'citacao': 'Muita gente tinha que ir para Goiânia fazer o exame e voltava só para buscar o resultado', 'status': 'confirmado'},
    {'texto': 'Cidades vizinhas sem ressonância', 'fonte': T, 'citacao': 'vem muita gente de Santa Helena, de Montividiu e de Jataí, porque nessas cidades não tem ressonância', 'status': 'confirmado'},
    {'texto': 'Laudo demorado faz o paciente perder o retorno com o médico', 'fonte': T, 'citacao': 'Em alguns lugares o laudo demora mais de uma semana e o paciente perde o retorno com o médico', 'status': 'confirmado'},
]
f['diferenciais'] += [
    {'texto': 'Tomógrafo de 64 canais', 'fonte': T, 'citacao': 'o tomógrafo é de 64 canais', 'status': 'confirmado'},
    {'texto': 'Laudo em até 48 horas e resultado online pelo celular', 'fonte': T, 'citacao': 'O laudo sai em até 48 horas e o paciente acessa o resultado online, pelo celular', 'status': 'confirmado'},
    {'texto': 'Atendimento aos sábados pela manhã, das 7h às 12h', 'fonte': T, 'citacao': 'abrimos aos sábados pela manhã, das sete ao meio-dia', 'status': 'confirmado'},
    {'texto': 'Encaixe no mesmo dia quando há vaga', 'fonte': T, 'citacao': 'Quando tem vaga a gente encaixa no mesmo dia', 'status': 'a_confirmar'},
]
f['convenios'] = {'situacao': 'sim', 'lista': ['Plano Vale Saúde', 'Assistência Rio', 'Saúde Cerrado', 'Prev Goiás'], 'fonte': T,
                  'citacao': 'Os principais aqui são o Plano Vale Saúde, a Assistência Rio, o Saúde Cerrado e o Prev Goiás', 'status': 'a_confirmar'}
f['publico'] = 'Pacientes encaminhados por ortopedistas e neurologistas, muitos exames de joelho, ombro e coluna; bastante atendimento particular.'
f['observacoes'] = ['Sem preço na página e nos anúncios (pedido da Dra. Helena).', 'Convênios: os quatro principais citados; a lista completa vem pelo grupo.']
gravar('ficha.json', f)

TIPOS = ['abertura', 'dor', 'agravamento', 'servico', 'diferencial', 'diferencial', 'prova', 'cta', 'reforco']
CTA = 'Clique agora no botão do WhatsApp e converse com nossa equipe.'


def roteiro(falas):
    return {'blocos': [{'tipo': t, 'fala': x} for t, x in zip(TIPOS, falas)]}


p1 = {
    'servico': 'Ressonância magnética', 'slug': '',
    'copy': {
        'title': 'Ressonância Magnética em Rio Verde | Clínica Vértice',
        'description': 'Ressonância magnética em Rio Verde com laudo em até 48 horas, resultado online e parcelamento em até 10x. Agende pelo WhatsApp.',
        'subtitulo': 'Ressonância de 1,5 Tesla para exames de joelho, ombro e coluna, com agendamento pelo WhatsApp.',
        'pontos': ['Laudo em até 48 horas e resultado online', 'Parcelamento em até 10x sem juros', 'Estacionamento próprio e atendimento aos sábados'],
        'cta': 'Agendar exame', 'texto_whatsapp': 'Olá, quero agendar uma ressonância magnética.', 'legenda_video': 'Conheça a Clínica Vértice',
        'conv_titulo': 'Aceitamos os principais convênios', 'dep_titulo': 'Depoimentos de pacientes',
        'alt_poster': 'Sala de ressonância magnética da Clínica Vértice em Rio Verde',
        'alt_logo': 'Clínica Vértice Imagem · ressonância magnética e tomografia em Rio Verde',
    },
    'roteiro': roteiro([
        'Se você estava no google procurando por ressonância magnética em Rio Verde, você chegou ao lugar certo!',
        'Seu médico pediu uma ressonância e você não quer viajar até Goiânia para fazer o exame?',
        'Laudo que demora mais de uma semana faz você perder o retorno com o médico.',
        'Na Clínica Vértice, em Rio Verde, você faz sua ressonância magnética de 1,5 Tesla.',
        'O laudo sai em até 48 horas e você vê o resultado online, pelo celular.',
        'Parcelamos em até 10 vezes sem juros e temos estacionamento próprio para pacientes.',
        'Há 12 anos em Rio Verde, recebemos pacientes de Santa Helena, Montividiu e Jataí.',
        CTA,
        'Clínica Vértice Imagem, entre em contato e agende sua ressonância magnética!',
    ]),
    'anuncios': {
        'titulos': ['Ressonância em Rio Verde', 'Ressonância Magnética', 'Laudo em Até 48 Horas', 'Resultado Online no Celular', 'Parcele em Até 10x Sem Juros',
                    'Agende Pelo WhatsApp', 'Ressonância de 1,5 Tesla', 'Estacionamento Próprio', 'Atendimento aos Sábados', 'Clínica Vértice Imagem',
                    'Há 12 Anos em Rio Verde', 'Joelho, Ombro e Coluna'],
        'descricoes': ['Ressonância magnética em Rio Verde com laudo em até 48 horas. Agende pelo WhatsApp.',
                       'Resultado online pelo celular, parcelamento em até 10x e estacionamento próprio.',
                       'Exames de joelho, ombro e coluna. Atendemos Rio Verde e região, também aos sábados.',
                       'Aceitamos os principais convênios e atendimento particular. Fale com a nossa equipe.'],
    },
    'grupos': [
        {'intencao': 'geral', 'palavras': ['ressonância magnética rio verde', 'ressonância rio verde', 'ressonância magnética em rio verde', 'clínica de ressonância em rio verde',
                                           'exame de ressonância rio verde', 'ressonância de joelho rio verde', 'ressonância de coluna rio verde', 'ressonância de ombro rio verde',
                                           'ressonância magnética santa helena de goiás', 'ressonância magnética jataí', 'ressonância montividiu']},
        {'intencao': 'preco', 'palavras': ['ressonância magnética preço rio verde', 'valor ressonância magnética rio verde', 'quanto custa ressonância magnética'],
         'titulos': ['Consulte Valores no WhatsApp', 'Parcele em Até 10x'],
         'descricoes': ['Consulte valores e condições pelo WhatsApp. Parcelamento em até 10x sem juros no cartão.']},
        {'intencao': 'convenio', 'palavras': ['ressonância por convênio rio verde', 'ressonância plano vale saúde'], 'titulos': ['Aceitamos Convênios']},
        {'intencao': 'perto', 'palavras': ['ressonância magnética perto de mim', 'ressonância perto de mim'], 'titulos': ['Ressonância Perto de Você']},
        {'intencao': 'agendamento', 'palavras': ['agendar ressonância magnética rio verde', 'marcar ressonância rio verde'], 'titulos': ['Agende Sua Ressonância']},
    ],
}
p2 = {
    'servico': 'Tomografia', 'slug': 'tomografia',
    'copy': {
        'title': 'Tomografia em Rio Verde | Clínica Vértice Imagem',
        'description': 'Tomografia computadorizada em Rio Verde com tomógrafo de 64 canais, laudo em até 48 horas e resultado online. Agende pelo WhatsApp.',
        'subtitulo': 'Tomografia computadorizada com tomógrafo de 64 canais, laudo em até 48 horas e agendamento pelo WhatsApp.',
        'pontos': ['Resultado online pelo celular', 'Parcelamento em até 10x sem juros', 'Estacionamento próprio e atendimento aos sábados'],
        'cta': 'Agendar exame', 'texto_whatsapp': 'Olá, quero agendar uma tomografia.', 'legenda_video': 'Conheça a Clínica Vértice',
        'conv_titulo': 'Aceitamos os principais convênios', 'dep_titulo': 'Depoimentos de pacientes',
        'alt_poster': 'Sala de tomografia da Clínica Vértice em Rio Verde',
        'alt_logo': 'Clínica Vértice Imagem · ressonância magnética e tomografia em Rio Verde',
    },
    'roteiro': roteiro([
        'Se você estava no google procurando por tomografia em Rio Verde, você chegou ao lugar certo!',
        'Precisa fazer uma tomografia e não quer esperar semanas por uma vaga?',
        'Laudo demorado atrasa o seu tratamento e faz você perder o retorno com o médico.',
        'Na Clínica Vértice, em Rio Verde, você faz sua tomografia em tomógrafo de 64 canais.',
        'O laudo sai em até 48 horas e você acessa o resultado online, pelo celular.',
        'Parcelamos em até 10 vezes sem juros, com Pix e estacionamento próprio.',
        'Há 12 anos em Rio Verde, atendemos pacientes de toda a região.',
        CTA,
        'Clínica Vértice Imagem, entre em contato e agende sua tomografia!',
    ]),
    'anuncios': {
        'titulos': ['Tomografia em Rio Verde', 'Tomógrafo de 64 Canais', 'Laudo em Até 48 Horas', 'Resultado Online no Celular', 'Parcele em Até 10x Sem Juros',
                    'Agende Pelo WhatsApp', 'Estacionamento Próprio', 'Atendimento aos Sábados', 'Clínica Vértice Imagem', 'Há 12 Anos em Rio Verde'],
        'descricoes': ['Tomografia computadorizada em Rio Verde com laudo em até 48 horas. Agende já.',
                       'Tomógrafo de 64 canais, resultado online e parcelamento em até 10x sem juros.',
                       'Atendemos Rio Verde e região, também aos sábados pela manhã. Fale com a nossa equipe.'],
    },
    'grupos': [
        {'intencao': 'geral', 'palavras': ['tomografia rio verde', 'tomografia computadorizada rio verde', 'tomografia em rio verde', 'clínica de tomografia em rio verde', 'exame de tomografia rio verde']},
        {'intencao': 'preco', 'palavras': ['tomografia preço rio verde', 'valor tomografia rio verde'], 'titulos': ['Consulte Valores no WhatsApp']},
        {'intencao': 'perto', 'palavras': ['tomografia perto de mim']},
        {'intencao': 'agendamento', 'palavras': ['agendar tomografia rio verde']},
        {'intencao': 'convenio', 'palavras': ['tomografia por convênio rio verde']},
    ],
}
gravar('plano.json', {
    'schema': 'w7-plano', 'versao': 1, 'paginas': [p1, p2],
    'sitelinks': [
        {'texto': 'Ressonância Magnética', 'descricao1': 'Laudo em até 48 horas', 'descricao2': 'Agende pelo WhatsApp'},
        {'texto': 'Tomografia', 'descricao1': 'Tomógrafo de 64 canais', 'descricao2': 'Resultado online'},
        {'texto': 'Convênios Aceitos', 'descricao1': 'Os principais convênios', 'descricao2': 'E atendimento particular'},
        {'texto': 'Como Chegar', 'descricao1': 'Estacionamento próprio', 'descricao2': 'Setor Central, Rio Verde'},
    ],
    'frases': ['Laudo em até 48 horas', 'Resultado online', 'Parcele em até 10x', 'Estacionamento próprio', 'Aberto aos sábados'],
})
print('ficha.json e plano.json gravados')
