import React, { useState } from 'react';
import { push, ref as dbRef } from 'firebase/database';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../fb';

const AdminChallengeForm = () => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    prize: '',
    deadline: '',
    type: 'photo',
    imageFile: null,
    brand: {
      name: '',
      logo: '',
      verified: true
    }
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleImageChange = (e) => {
    setForm({ ...form, imageFile: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.imageFile) return alert("Adicione uma imagem.");

    setLoading(true);
    try {
      const imgRef = ref(storage, `challenges/banners/${Date.now()}_${form.imageFile.name}`);
      await uploadBytes(imgRef, form.imageFile);
      const bannerURL = await getDownloadURL(imgRef);

      const challengeData = {
        ...form,
        brand: {
          name: form.brand.name,
          logo: form.brand.logo,
          verified: true
        },
        coverImage: bannerURL,
        interaction: "0 curtidas",
        participants: 0,
        createdAt: Date.now()
      };

      await push(dbRef(db, 'challenges'), challengeData);
      alert("Desafio criado com sucesso!");
      setForm({
        title: '',
        description: '',
        prize: '',
        deadline: '',
        type: 'photo',
        imageFile: null,
        brand: { name: '', logo: '', verified: true }
      });
    } catch (error) {
      console.error(error);
      alert("Erro ao criar desafio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-md max-w-2xl mx-auto mb-10">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Criar novo desafio</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input name="title" placeholder="Título" className="border rounded px-4 py-2" value={form.title} onChange={handleInputChange} required />
        <input name="brand.name" placeholder="Nome da Marca" className="border rounded px-4 py-2" value={form.brand.name} onChange={(e) => setForm({ ...form, brand: { ...form.brand, name: e.target.value } })} required />
        <input name="prize" placeholder="Prémio" className="border rounded px-4 py-2" value={form.prize} onChange={handleInputChange} required />
        <input name="deadline" type="date" className="border rounded px-4 py-2" value={form.deadline} onChange={handleInputChange} required />
        <select name="type" className="border rounded px-4 py-2" value={form.type} onChange={handleInputChange}>
          <option value="photo">Foto</option>
          <option value="video">Vídeo</option>
        </select>
        <input name="brand.logo" placeholder="Logo URL" className="border rounded px-4 py-2" value={form.brand.logo} onChange={(e) => setForm({ ...form, brand: { ...form.brand, logo: e.target.value } })} required />
      </div>

      <textarea name="description" placeholder="Descrição / Regras" rows={3} className="border rounded px-4 py-2 w-full mt-4" value={form.description} onChange={handleInputChange} required />

      <div className="mt-4">
        <label className="block mb-2 font-medium text-gray-700">Imagem/Banner</label>
        <input type="file" accept="image/*" onChange={handleImageChange} required />
      </div>

      <button disabled={loading} type="submit" className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-bold">
        {loading ? "A criar..." : "Criar Desafio"}
      </button>
    </form>
  );
};

export default AdminChallengeForm;
