
import http from "k6/http";
import {check, group} from "k6";
import {
    mockAsset,
} from "./helpers.js";

const BASE_URL = "http://localhost:3000";

export const options = {
    vus: 30,
    duration: '10s',
    thresholds: {
        checks: ['rate>=0.995'],
        http_req_duration: ['avg<12000', 'p(95)<18000'],
        http_req_failed: ['rate<0.005'],
        http_reqs: ['rate>=25']
    },
    noConnectionReuse: true,
};

export default function() {
    group("/api/asset/upload medium files", () => {
        let url = BASE_URL + `/api/asset/upload`;
        // Request No. 1: ApiController_assetUpload small files
        {
            const data = mockAsset('sm');
            // Send the PUT request
            const request = http.put(url, data);
            check(request, {
                "": (r) => r.status === 202
            });
        }
    });
}