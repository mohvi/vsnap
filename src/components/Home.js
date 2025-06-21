import React, { useState } from 'react';
import { Share2, Zap, Award, TrendingUp, Users, Sparkles, ChevronRight, Heart, MessageSquare, X, Check, Image, Video, Camera } from 'lucide-react';

const HomePage = () => {
  const [activeTab, setActiveTab] = useState('destaques');
  const [showParticipateModal, setShowParticipateModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [submission, setSubmission] = useState({
    image: null,
    caption: '',
    termsAccepted: false
  });

  // Exemplos reais de desafios de marcas
  const featuredChallenges = [
    {
      id: 1,
      brand: {
        name: "CDM",
        logo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAAfCAMAAACF8f6iAAAAt1BMVEWwHin///+oAACwHCeuDx6tCRr73xCsABCtBRivFyOrAADXpqn69fXUnaCtABTfuLrkxMbPjpHCa3DIfoKsACrpz9GyLDWxJS/Qk5erAAe3RUzHeX3r1dfx3+DbrK+7U1nAZGr06uvls3v/22X+23P74qj19vv/9Mm+SADlsxX+2AD/0Rjz7+P535vakwDPjZfiqADSn6qzND3cs73/6hHAUwC/aHfzxRf/vAj/xwu7U2DThhXPeCJrAv64AAAB0klEQVQ4je2S23bUIBSGOU4ghJzI+ThRW22m1hirnarv/1xukpnlDXPhnRf914KfBXzsvQGE3vTfivLQ84REzKt9vw7lNsU5tWvgNznmmSiOdOO3cdf3+TD6lMokSSSQITi7wXkp3lXFl0EuZAOmQ8QN+CidHL9yOAXwfht15GjNo2Sy884QVNotvWljTN69/3AXAHr/8ZPZUiCtNeOskldbBM5qkT0cDvPp7vHx8/z0xRIB6TdeOCu0hY02GWpBQOf5cFi+bilHWz+ELrDOYWndys8eng+7npdv+K8izwWGg03GR0iGe8RNT/E1HPR57QLlaJdbQpqBLfM14vcOY2XJSMHN+S4Q+fvrBRj/WF73XOcX+wxqtUVojCfiBKnXXWqJl/Npnk+v5xdK4BxNdAQNznRHRJQk0/Zffv46Wy2/M1RPATZMeIK1OJiclwMgFUQUktQyyzKa2Y4inxAOK5QyQgh1cqwAUVqUpWQFXdmKGC14AT9clAUq4aHW0kUKlXZDrpK+0Xk1HHU+HONcDXrMoyjvtFJJ1TcukBmjk+qYqhZMjboyozGVGXSSpAq6oTLKCSLGBOeSCWtCCs4kY5yv0JiAqRDMXeONG/uHvW+66A/8BSHuqQ0AZgAAAABJRU5ErkJggg==",
        verified: true
      },
      title: "MELHOR FOTO COM CDM NO VERÃO",
      description: "Capture seu momento com CDM na praia, piscina ou em qualquer lugar de verão. Mostre criatividade e originalidade!",
      prize: "Uma grade de cervejas CDM + R$5.000 em dinheiro",
      participants: 312,
      deadline: "Termina em 5 dias",
      coverImage: "https://scontent.fnbo19-2.fna.fbcdn.net/v/t39.30808-6/465132271_9146077245424643_234251552846165849_n.png?_nc_cat=111&ccb=1-7&_nc_sid=0b6b33&_nc_ohc=RhQqNhgxj-wQ7kNvwG7gIp2&_nc_oc=AdlKPJX_y-X0fp8rlwuIgguVCyKmk6EvgA943VcwYpkiTf4DlYkOFZPKx5jLRAeIFmgO_4FBhsgUlMR9PMyzFwWo&_nc_zt=23&_nc_ht=scontent.fnbo19-2.fna&_nc_gid=MKLN00rgbVAxI2wObXVNug&oh=00_AfNVPhWxTL0X4XlhvsuT6pceWEZ3i3KuHNytd9hoapXc5A&oe=684FE972",
      interaction: "3.8K curtidas",
      type: "photo"
    },
    {
      id: 2,
      brand: {
        name: "Coca-Cola",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Coca-Cola_logo.svg/1200px-Coca-Cola_logo.svg.png",
        verified: true
      },
      title: "VÍDEO CRIATIVO COM COCA-COLA",
      description: "Crie um vídeo de 15-30 segundos mostrando seu momento de refrescância com Coca-Cola. Use a hashtag #ShareACoke",
      prize: "R$10.000 + Aparecer no comercial oficial",
      participants: 892,
      deadline: "Termina em 2 dias",
      coverImage: "https://www.coca-cola.com/content/dam/onexp/mx/es/brands/coca-cola/Coca-Cola_Principal_Bottle_500ml.png",
      interaction: "12.5K curtidas",
      type: "video"
    },
    {
      id: 3,
      brand: {
        name: "Nike",
        logo: "https://static.nike.com/a/images/f_jpg,q_auto:eco/61b4738b-e1e1-4786-8f6c-26aa0008e80b/swoosh-logo-black.png",
        verified: true
      },
      title: "FOTO DE TREINO COM NIKE",
      description: "Mostre seu treino com produtos Nike. Melhor foto ganha um kit completo de roupas e tênis!",
      prize: "Kit Nike no valor de R$3.000",
      participants: 1245,
      deadline: "Termina em 7 dias",
      coverImage: "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/skwgyqrbfzhu6uyeh0gg/air-max-270-mens-shoes-KkLcGR.png",
      interaction: "8.2K curtidas",
      type: "photo"
    },
    {
      id: 4,
      brand: {
        name: "Red Bull",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Red_Bull.svg/1200px-Red_Bull.svg.png",
        verified: true
      },
      title: "VÍDEO DE AVENTURA EXTREMA",
      description: "Grave um vídeo mostrando sua aventura radical com Red Bull. Pode ser esporte, viagem ou desafio pessoal!",
      prize: "Viagem para evento Red Bull + R$7.000",
      participants: 543,
      deadline: "Termina em 10 dias",
      coverImage: "https://www.redbull.com/_next/image/?url=https%3A%2F%2Fimg.redbull.com%2Fimages%2Fc_limit%2Cw_1500%2Ch_1500%2Cf_auto%2Cq_auto%2Fv1%2Fcontenthub%2F2022%2F05%2F17%2Fb3a5c3a6-8a6d-4e45-8438-3780e8a8a5a3%2Fred-bull-energy-drink&w=3840&q=75",
      interaction: "5.1K curtidas",
      type: "video"
    }
  ];

  const trendingBrands = [
    { id: 1, name: "2M", logo: "https://cdm.co.mz/wp-content/themes/cdm/img/logo-cdm-abinbev.png", challenges: 5 },
    { id: 2, name: "CDM", logo: "https://cdm.co.mz/wp-content/themes/cdm/img/logo-cdm-abinbev.png", challenges: 3 },
    { id: 3, name: "Coca-Cola", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Coca-Cola_logo.svg/1200px-Coca-Cola_logo.svg.png", challenges: 2 },
    { id: 4, name: "Unitel", logo: "https://www.unitel.mz/wp-content/uploads/2022/02/unitel-logo.png", challenges: 4 },
    { id: 5, name: "Nike", logo: "https://static.nike.com/a/images/f_jpg,q_auto:eco/61b4738b-e1e1-4786-8f6c-26aa0008e80b/swoosh-logo-black.png", challenges: 6 },
    { id: 6, name: "Red Bull", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Red_Bull.svg/1200px-Red_Bull.svg.png", challenges: 3 },
    { id: 7, name: "Apple", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/1200px-Apple_logo_black.svg.png", challenges: 2 },
    { id: 8, name: "Samsung", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Samsung_Logo.svg/1200px-Samsung_Logo.svg.png", challenges: 4 }
  ];

  const handleParticipateClick = (challenge) => {
    setSelectedChallenge(challenge);
    setShowParticipateModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Lógica para enviar a participação
    alert(`Participação enviada para o desafio: ${selectedChallenge.title}`);
    setShowParticipateModal(false);
    setSubmission({ image: null, caption: '', termsAccepted: false });
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSubmission({ ...submission, image: URL.createObjectURL(e.target.files[0]) });
    }
  };

  // Componente ChallengeCard
  const ChallengeCard = ({ challenge }) => {
    return (
      <div className="border rounded-2xl overflow-hidden hover:shadow-lg transition duration-300 bg-white">
        <div className="relative h-48 bg-gradient-to-br from-pink-100 to-blue-100">
          <img 
            src={challenge.coverImage} 
            alt={challenge.title}
            className="w-full h-full object-contain"
          />
          <div className="absolute top-4 left-4 flex items-center">
            <img 
              src={challenge.brand.logo} 
              alt={challenge.brand.name} 
              className="w-10 h-10 rounded-full border-2 border-white bg-white shadow-md"
            />
            <span className="ml-2 font-medium text-white bg-gradient-to-r from-pink-500 to-blue-500 px-3 py-1 rounded-full text-sm flex items-center">
              {challenge.brand.name}
              {challenge.brand.verified && (
                <svg className="w-4 h-4 inline ml-1 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82 1.89 3.2L12 21.04l3.4 1.47 1.89-3.2 3.61-.82-.34-3.7L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z"/>
                </svg>
              )}
            </span>
          </div>
          <div className="absolute top-4 right-4 bg-white/90 rounded-full px-3 py-1 text-sm font-medium flex items-center shadow-sm">
            {challenge.type === 'photo' ? (
              <>
                <Image className="w-4 h-4 mr-1 text-pink-500" /> Foto
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-1 text-blue-500" /> Vídeo
              </>
            )}
          </div>
        </div>
        
        <div className="p-5">
          <h3 className="text-xl font-bold mb-2 text-gray-800">{challenge.title}</h3>
          <p className="text-gray-600 mb-4">{challenge.description}</p>
          
          <div className="flex justify-between items-center mb-4">
            <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
              <Award className="w-4 h-4 mr-1" /> {challenge.prize}
            </div>
            <div className="text-gray-500 text-sm flex items-center">
              <Zap className="w-4 h-4 mr-1" /> {challenge.deadline}
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-4 text-sm">
            <div className="text-gray-500 flex items-center">
              <Users className="w-4 h-4 mr-1" /> {challenge.participants} participantes
            </div>
            <div className="flex space-x-3">
              <span className="flex items-center text-gray-500">
                <Heart className="w-4 h-4 mr-1 text-pink-500" /> {challenge.interaction.split(' ')[0]}
              </span>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button 
              onClick={() => handleParticipateClick(challenge)}
              className="bg-gradient-to-r from-pink-500 to-blue-500 text-white px-4 py-2 rounded-lg flex-1 hover:from-pink-600 hover:to-blue-600 transition flex items-center justify-center shadow-md hover:shadow-lg"
            >
              Participar Agora
            </button>
            <button className="border border-gray-200 bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition flex items-center justify-center shadow-sm">
              <Share2 className="w-5 h-5 mr-2" /> Compartilhar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const BrandShowcase = ({ brands }) => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {brands.map(brand => (
          <div key={brand.id} className="border rounded-xl p-4 text-center hover:shadow-md transition cursor-pointer bg-white transform hover:-translate-y-1">
            <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden border-2 border-gray-200 bg-white p-2">
              <img src={brand.logo} alt={brand.name} className="w-full h-full object-contain" />
            </div>
            <h3 className="font-bold text-gray-800">{brand.name}</h3>
            <p className="text-sm text-gray-500">{brand.challenges} desafios</p>
          </div>
        ))}
      </div>
    );
  };

const ParticipateModal = () => {
  if (!showParticipateModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-bold text-gray-800">Participar no desafio</h3>
          <button 
            onClick={() => setShowParticipateModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1"> {/* Adicionei overflow-y-auto e flex-1 aqui */}
          <div className="p-6">
            <div className="flex items-center mb-6">
              <img 
                src={selectedChallenge.brand.logo} 
                alt={selectedChallenge.brand.name} 
                className="w-12 h-12 rounded-full border-2 border-white bg-white shadow-md mr-3"
              />
              <div>
                <h4 className="font-bold text-gray-800">{selectedChallenge.brand.name}</h4>
                <p className="text-sm text-gray-500">{selectedChallenge.title}</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">
                  {selectedChallenge.type === 'photo' ? 'Envie sua foto' : 'Envie seu vídeo'}
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 transition bg-gray-50">
                  {submission.image ? (
                    <div className="relative">
                      {selectedChallenge.type === 'photo' ? (
                        <img src={submission.image} alt="Preview" className="w-full h-48 object-contain mx-auto" />
                      ) : (
                        <video controls className="w-full h-48 object-contain mx-auto">
                          <source src={submission.image} type="video/mp4" />
                          Seu navegador não suporta vídeos.
                        </video>
                      )}
                      <button 
                        type="button"
                        onClick={() => setSubmission({...submission, image: null})}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
                      >
                        <X className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                        {selectedChallenge.type === 'photo' ? (
                          <Image className="w-6 h-6 text-blue-500" />
                        ) : (
                          <Video className="w-6 h-6 text-blue-500" />
                        )}
                      </div>
                      <p className="text-gray-500 mb-1">Clique para enviar ou arraste arquivos</p>
                      <p className="text-sm text-gray-400">
                        {selectedChallenge.type === 'photo' 
                          ? "Formatos: JPG, PNG (até 10MB)" 
                          : "Formatos: MP4 (15-60 segundos, até 50MB)"}
                      </p>
                      <input 
                        type="file" 
                        accept={selectedChallenge.type === 'photo' ? "image/*" : "video/*"}
                        onChange={handleImageChange}
                        className="hidden"
                        id="media-upload"
                      />
                      <label 
                        htmlFor="media-upload"
                        className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition cursor-pointer"
                      >
                        Selecionar arquivo
                      </label>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">Legenda</label>
                <textarea 
                  value={submission.caption}
                  onChange={(e) => setSubmission({...submission, caption: e.target.value})}
                  placeholder={`Escreva uma legenda criativa para sua ${selectedChallenge.type === 'photo' ? 'foto' : 'vídeo'}...`}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Não esqueça de incluir a hashtag #{selectedChallenge.brand.name.replace(/\s+/g, '')} e outras relevantes
                </p>
              </div>
              
              <div className="mb-6">
                <label className="flex items-start">
                  <input 
                    type="checkbox" 
                    checked={submission.termsAccepted}
                    onChange={(e) => setSubmission({...submission, termsAccepted: e.target.checked})}
                    className="mt-1 mr-2"
                    required
                  />
                  <span className="text-sm text-gray-600">
                    Concordo com os termos do desafio e confirmo que este conteúdo é original e foi criado por mim.
                  </span>
                </label>
              </div>
              
              <button 
                type="submit"
                disabled={!submission.image || !submission.termsAccepted}
                className={`w-full py-3 rounded-lg font-bold flex items-center justify-center ${!submission.image || !submission.termsAccepted ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-pink-500 to-blue-500 text-white hover:from-pink-600 hover:to-blue-600 shadow-md'}`}
              >
                <Check className="w-5 h-5 mr-2" /> Enviar Participação
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="p-4 bg-gray-50">
      <section className="relative h-96 rounded-2xl overflow-hidden mb-10 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-90"></div>
        <div className="absolute inset-0 flex items-center px-10 z-10">
          <div className="max-w-xl">
            <h1 className="text-4xl font-bold text-white mb-4">
              Desafios que conectam <span className="text-yellow-300">você</span> às melhores marcas
            </h1>
            <p className="text-xl text-white/90 mb-6">
              Participe, crie conteúdo autêntico e ganhe prêmios incríveis!
            </p>
            <button className="bg-gradient-to-r from-yellow-400 to-yellow-300 text-blue-900 px-6 py-3 rounded-full font-bold flex items-center hover:from-yellow-300 hover:to-yellow-200 transition transform hover:scale-105 shadow-lg">
              <Zap className="mr-2" /> Ver Desafios em Destaque
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/30 to-transparent"></div>
      </section>

      <div className="flex border-b mb-8 bg-white rounded-t-lg shadow-sm">
        <button 
          onClick={() => setActiveTab('destaques')}
          className={`px-6 py-3  flex items-center ${activeTab === 'destaques' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Sparkles className="mr-2" /> Desafios
        </button>
        <button 
          onClick={() => setActiveTab('marcas')}
          className={`px-6 py-3  flex items-center ${activeTab === 'marcas' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <TrendingUp className="mr-2" /> Marcas
        </button>
      </div>

      <div className="mb-12">
        {activeTab === 'destaques' && (
          <div className="grid md:grid-cols-2 gap-6">
            {featuredChallenges.map(challenge => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        )}

        {activeTab === 'marcas' && (
          <BrandShowcase brands={trendingBrands} />
        )}
      </div>

      <section className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8 mb-10 text-center shadow-inner">
        <h2 className="text-2xl font-bold mb-2 text-gray-800">Sua marca aqui!</h2>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Conecte-se com milhares de criadores de conteúdo e aumente seu engajamento com desafios patrocinados.
        </p>
        <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-full font-bold hover:shadow-lg transition flex items-center mx-auto">
          Saiba mais para marcas <ChevronRight className="inline ml-2" />
        </button>
      </section>
      <ParticipateModal />
    </div>
  );
};

export default HomePage;