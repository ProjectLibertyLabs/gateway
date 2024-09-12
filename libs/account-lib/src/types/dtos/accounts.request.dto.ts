import {IsNotEmpty, IsNumber, IsNumberString, Min} from "class-validator";
import {ApiProperty} from "@nestjs/swagger";
import {IsHexValue} from "#account-lib/utils/custom.decorator";

export class MsaIdParam {
    @ApiProperty({ type: String, description: 'MSA Id of account' })
    @IsNumberString( { no_symbols: true })
    @IsNotEmpty()
    msaId: string;
}

export class PublicKeyParam {
    @ApiProperty({ type: String, description: 'Public key in hex format!' })
    @IsHexValue({ minLength: 64, maxLength: 64, message: 'Public key should be a 32 bytes value in hex format!' })
    publicKey: string;
}