import React from "react";
import { Link } from "react-router-dom";

const profiles = [
  {
    id: 1,
    name: "Jaqueline Andia",
    points: Math.floor(Math.random() * 1000),
    photo: "https://i.pinimg.com/originals/a2/f3/46/a2f3465bcdddbccffde136f934a81523.jpg",
  },
  {
    id: 2,
    name: "Saiid",
    points: Math.floor(Math.random() * 1000),
    photo: "https://scontent-jnb2-1.xx.fbcdn.net/v/t39.30808-1/305487482_1142172523175903_4236088211079110863_n.jpg?stp=cp0_dst-jpg_s40x40_tt6&_nc_cat=104&ccb=1-7&_nc_sid=e99d92&_nc_eui2=AeHtRjqInHGEcisy6_lnc3-MS8URNjsyMNZLxRE2OzIw1uvPhb-3q94YPIb0mCOB3uKoAym3hPLpkkAekYLOjBGI&_nc_ohc=TxX32QqubJYQ7kNvgFyA2kz&_nc_zt=24&_nc_ht=scontent-jnb2-1.xx&_nc_gid=AjTEGivUJSrQAFo_uE0B74F&oh=00_AYCZop4Gv1JT1ZC-OIf-kiVtJGBor4C6olrlKtpWXakqPw&oe=67708627",
  },
  {
    id: 3,
    name: "Namparama",
    points: Math.floor(Math.random() * 1000),
    photo: "https://source.unsplash.com/random/200x200?face3",
  },
  {
    id: 4,
    name: "Kadre",
    points: Math.floor(Math.random() * 1000),
    photo: "https://scontent-jnb2-1.xx.fbcdn.net/v/t39.30808-1/470671322_122097230210696422_7479542335227105214_n.jpg?stp=c0.0.810.810a_cp0_dst-jpg_s32x32_tt6&_nc_cat=102&ccb=1-7&_nc_sid=e99d92&_nc_eui2=AeHh3QuOQRaqfFWU4UQ9F3pfmvlEfLbGOfea-UR8tsY59-8bMXmOpIuV63ZRCnyBMXuo27HqkCjVEZviFHlJWyp4&_nc_ohc=uEAjZg9vaEgQ7kNvgFcwWk6&_nc_zt=24&_nc_ht=scontent-jnb2-1.xx&_nc_gid=AC1rZQ9dEOkids-KCCj5KWK&oh=00_AYBXZZWIeiFCSkhUtF0tUvG9QEt6SHgCFPDNnKywijuMeg&oe=67708602",
  },
  {
    id: 5,
    name: "Luíisaah",
    points: Math.floor(Math.random() * 1000),
    photo: "https://scontent-jnb2-1.xx.fbcdn.net/v/t39.30808-1/463542713_9367370403280324_1790712508444077020_n.jpg?stp=dst-jpg_p100x100_tt6&_nc_cat=101&ccb=1-7&_nc_sid=e99d92&_nc_eui2=AeH1NR1A0m4wKgDB9ePehiTW_3C-XPzmlJT_cL5c_OaUlJ-fzkvDYOZj3lfL5shGQkbjfqT-_UMoJdADv_Br9z0s&_nc_ohc=pfwwjACwssMQ7kNvgHNIeCH&_nc_zt=24&_nc_ht=scontent-jnb2-1.xx&_nc_gid=ADAcnrU9j2vu9nV1x0ZrObB&oh=00_AYC7S1fVW9AyMt5SkBDW5gKsr8LPjh4y84Aam2mZYDArWQ&oe=67708F4C",
  },
];

const RankingWinners = () => {
  return (
    <section className="mt-6">
      <h2 className="text-xl font-semibold text-blue-600 mb-4">Ranking de Vencedores Top</h2>
      <div className="flex overflow-x-auto gap-4">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="min-w-[200px] bg-white rounded-lg shadow-lg p-4 border border-gray-200 hover:shadow-xl transition-shadow duration-300"
          >
            <img
              src={profile.photo}
              alt={profile.name}
              className="w-16 h-16 rounded-full mx-auto mb-3"
            />
            <h3 className="font-bold text-lg text-blue-600 text-center">{profile.name}</h3>
            <p className="text-gray-600 text-center">Pontos: {profile.points}</p>
            <Link
              to={`/profile/${profile.id}`}
              className="text-blue-600 mt-2 block text-center hover:text-blue-800 transition-colors duration-300"
            >
              Ver Perfil
            </Link>
          </div>
        ))}
      </div>
      <Link
        to="/ranking"
        className="mt-4 inline-block bg-blue-500 text-white font-bold py-2 px-6 rounded-md hover:bg-blue-400 transition-colors duration-300"
      >
        Ver Mais
      </Link>
    </section>
  );
};

export default RankingWinners;
