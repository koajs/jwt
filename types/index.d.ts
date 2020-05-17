// Type definitions for koa-jwt 2.x
// Project: https://github.com/koajs/jwt
// Definitions by: Bruno Krebs <https://github.com/brunokrebs/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

import Koa = require('koa');

export = jwt;

declare function jwt(options: jwt.Options): jwt.Middleware;

declare namespace jwt {
    export interface Options {
        secret: string | string[] | Buffer | Buffer[] | SecretLoader;
        key?: string;
        tokenKey?: string;
        getToken?(ctx: Koa.Context, opts: jwt.Options): string;
        isRevoked?(ctx: Koa.Context, decodedToken: object, token: string): Promise<boolean>;
        passthrough?: boolean;
        cookie?: string;
        debug?: boolean;
        audience?: string | string[];
        issuer?: string | string[];
        algorithms?: string[];
    }

    export type SecretLoader = (header: any, payload: any) => Promise<string | string[] | Buffer | Buffer[]>;

    export interface Middleware extends Koa.Middleware {
        unless(params?: {custom?: (ctx: Koa.Context) => boolean, path?: string | RegExp | (string | RegExp)[], ext?: string | string[],  method?: string | string[]}): Koa.Middleware;
    }
}
