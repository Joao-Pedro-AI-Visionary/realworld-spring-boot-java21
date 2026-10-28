// Credenciais de mock do modo demo. NAO sao segredo: o backend demo roda inteiro no navegador
// e estas contas sao publicas de proposito (aparecem no banner e na tela de login).
export const MOCK_DEMO_LOGIN = { email: 'demo@conduit.dev', password: 'demo1234' } as const // mock

export const MOCK_SEED_PASSWORDS = { demo: MOCK_DEMO_LOGIN.password, ana: 'ana12345', rafael: 'rafael123' } as const // mock
