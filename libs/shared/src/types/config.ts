export interface AppConfig {
    port: number;
    allowedOrigin: string[];
}
export interface FirestoreConfig {
    projectId: string;
    clientEmail: string;
    privateKey: string;
}