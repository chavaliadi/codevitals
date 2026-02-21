import * as babelParser from '@babel/parser';

export function parseCode(code: string, language: 'js' | 'ts') {
    return babelParser.parse(code, {
        sourceType: 'module',
        plugins: [
            language === 'ts' ? 'typescript' : 'flow',
            'jsx',
            'classProperties',
            'decorators-legacy',
            'dynamicImport',
            'optionalChaining',
            'nullishCoalescingOperator',
        ],
        errorRecovery: true, // don't throw on minor syntax issues
    });
}
