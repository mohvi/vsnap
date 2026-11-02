import { describe, expect, it } from 'vitest';
import { searchAll } from './search';
import { findNavItem } from './navItems';

const data = {
  users: { u1: { name: 'Ana Mondlane', username: 'ana', phone: '+258841112233' }, u2: { name: 'Rui', username: 'rui' } },
  challenges: { c1: { title: 'Pôr do sol', status: 'active' } },
  sponsors: { s1: { name: 'Café Maputo' } },
};

describe('pesquisa global', () => {
  it('sem texto mostra só as páginas', () => {
    expect(searchAll('', data).every((r) => r.group === 'Páginas')).toBe(true);
  });

  it('encontra utilizadores por nome, username ou telefone', () => {
    expect(searchAll('mondlane', data).find((r) => r.group === 'Utilizadores')?.to).toBe('/ul/u1');
    expect(searchAll('84111', data).some((r) => r.to === '/ul/u1')).toBe(true);
  });

  it('ignora acentos e leva aos desafios e marcas', () => {
    expect(searchAll('por do', data).find((r) => r.group === 'Desafios')?.to).toBe('/cl?q=P%C3%B4r%20do%20sol');
    expect(searchAll('cafe', data).find((r) => r.group === 'Marcas')?.to).toBe('/marcas/s1');
  });
});

describe('navegação', () => {
  it('associa sub-páginas ao item do menu', () => {
    expect(findNavItem('/ul/abc')?.label).toBe('Utilizadores');
    expect(findNavItem('/marcas')?.label).toBe('Marcas');
    expect(findNavItem('/nada')).toBeNull();
  });
});
