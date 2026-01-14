// Translation hook for React components
import { useCallback } from 'react';
import { useI18nStore, Language, ptBR, en, es } from '@/lib/i18n';

function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function getTranslations(lang: Language) {
  switch (lang) {
    case 'en':
      return en;
    case 'es':
      return es;
    default:
      return ptBR;
  }
}

export function useTranslation() {
  const { language, setLanguage } = useI18nStore();
  
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const translations = getTranslations(language);
    
    let text = getNestedValue(translations, key) || key;
    
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(value));
      });
    }
    
    return text;
  }, [language]);
  
  return { t, language, setLanguage };
}

// Language selector component
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export function LanguageSelector() {
  const { language, setLanguage } = useI18nStore();
  
  const currentLang = languages.find(l => l.code === language) || languages[0];
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5">
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">{currentLang.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={language === lang.code ? 'bg-muted' : ''}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
