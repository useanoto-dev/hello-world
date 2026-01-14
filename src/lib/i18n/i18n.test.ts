// i18n Tests
import { describe, it, expect, beforeEach } from 'vitest';
import { useI18nStore, t, ptBR, en, es } from '@/lib/i18n';

describe('i18n', () => {
  beforeEach(() => {
    // Reset to default language
    useI18nStore.setState({ language: 'pt-BR' });
  });

  describe('useI18nStore', () => {
    it('defaults to pt-BR', () => {
      const state = useI18nStore.getState();
      expect(state.language).toBe('pt-BR');
    });

    it('can change language', () => {
      useI18nStore.getState().setLanguage('en');
      expect(useI18nStore.getState().language).toBe('en');
    });
  });

  describe('t function', () => {
    it('returns Portuguese translation by default', () => {
      const result = t('common.save');
      expect(result).toBe('Salvar');
    });

    it('returns English translation when language is set', () => {
      useI18nStore.getState().setLanguage('en');
      const result = t('common.save');
      expect(result).toBe('Save');
    });

    it('returns Spanish translation when language is set', () => {
      useI18nStore.getState().setLanguage('es');
      const result = t('common.save');
      expect(result).toBe('Guardar');
    });

    it('handles nested keys', () => {
      const result = t('orders.status.pending');
      expect(result).toBe('Pendente');
    });

    it('returns key if translation not found', () => {
      const result = t('non.existent.key');
      expect(result).toBe('non.existent.key');
    });

    it('replaces parameters in translation', () => {
      const result = t('orders.activeOrders', { count: 5 });
      expect(result).toBe('5 ativos');
    });
  });

  describe('Translation completeness', () => {
    it('has same keys in all languages for common namespace', () => {
      const ptKeys = Object.keys(ptBR.common);
      const enKeys = Object.keys(en.common);
      const esKeys = Object.keys(es.common);
      
      expect(ptKeys.sort()).toEqual(enKeys.sort());
      expect(ptKeys.sort()).toEqual(esKeys.sort());
    });

    it('has same keys in all languages for orders namespace', () => {
      const ptKeys = Object.keys(ptBR.orders);
      const enKeys = Object.keys(en.orders);
      const esKeys = Object.keys(es.orders);
      
      expect(ptKeys.sort()).toEqual(enKeys.sort());
      expect(ptKeys.sort()).toEqual(esKeys.sort());
    });

    it('has same keys in all languages for settings namespace', () => {
      const ptKeys = Object.keys(ptBR.settings);
      const enKeys = Object.keys(en.settings);
      const esKeys = Object.keys(es.settings);
      
      expect(ptKeys.sort()).toEqual(enKeys.sort());
      expect(ptKeys.sort()).toEqual(esKeys.sort());
    });
  });
});
