declare module "better-sqlite3" {
    type DatabaseOptions = {
        readonly?: boolean;
        fileMustExist?: boolean;
        timeout?: number;
        verbose?: (...args: unknown[]) => void;
    };

    type Statement = {
        all(...params: unknown[]): unknown[];
    };

    class Database {
        constructor(filename: string, options?: DatabaseOptions);
        prepare(sql: string): Statement;
        close(): void;
    }

    export default Database;
}
