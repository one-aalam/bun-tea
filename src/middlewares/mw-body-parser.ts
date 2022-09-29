import type { MiddlewareFunctionInitializer } from '../core/middleware'
import type { ParsedFileField, ParsedFormData } from '../core/utils/parsers/form-data'
import { parseBody } from '../core/utils/parsers/req-body'
import { isObject } from '../core/utils/is'

type MiddlewareOptions = {
    extensions?: Array<string>,
    maxSizeBytes?: number,
    maxFileSizeBytes?: number
}

const MW_OPTION_DEFAULTS: MiddlewareOptions = {
    extensions: [],
    maxSizeBytes: Number.MAX_SAFE_INTEGER,
    maxFileSizeBytes: Number.MAX_SAFE_INTEGER
}

function isFileField(fieldTuple: [string, string | ParsedFileField ]): fieldTuple is [string, ParsedFileField] {
    return typeof fieldTuple[1] !== 'string';
}

function validateFormData(formData: ParsedFormData, options: Required<MiddlewareOptions>) {
    const { maxFileSizeBytes, maxSizeBytes, extensions } = options
    const fileFields = Object.entries(formData).filter(isFileField)
    let totalBytes = 0;
    let validations = "";
    for (const [_, file] of fileFields) {
        totalBytes += file.size;
        if (file.size > maxFileSizeBytes!) {
            validations += `Unsupported file upload size: ${file.size} bytes, for file: ${file.filename} (maximum: ${maxFileSizeBytes} bytes).`;
        }

        if (extensions.length) {
            const fileExt = (file.filename || '').split(".").pop()!
            if(!extensions.includes(fileExt)) {
                validations += `Unsupported file extension: ${fileExt} (allowed: ${extensions}).`;
            }
        }
    }
    if (totalBytes > maxSizeBytes!) {
        validations += `Unspported total upload size: ${totalBytes} bytes (maximum: ${maxSizeBytes} bytes).`;
    }
    return validations
}


export const bodyParser: MiddlewareFunctionInitializer<MiddlewareOptions> = (opts) => {
    const options = { ...MW_OPTION_DEFAULTS, ...opts }
    return async (ctx, next) => {
        if(ctx.method === 'post' || ctx.method === 'put' || ctx.method === 'patch') {
            const body = await parseBody(ctx.request!)
            if(isObject(body)) {
                // @ts-ignore
                const validationStr = validateFormData(body, options)
                if (validationStr != "") {
                    throw new Error(validationStr);
                }
            }
            ctx.body = body
        }
        await next()
    }
}