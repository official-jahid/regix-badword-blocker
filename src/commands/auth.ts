import { randomBytes } from "crypto";
import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import { createApiKey, listApiKeys, revokeApiKey } from "../lib/apiKey";
import { generateToken } from "../lib/jwt";
import {
  getJwtConfig,
  logAudit,
  updateApiKey,
  upsertJwtConfig,
} from "../lib/tokenService";
import type { HybridCommand } from "../types";

// ─── Language / Framework Integration Guides ──────────────────────────────

interface IntegrationGuide {
  label: string;
  emoji: string;
  language: string;
  code: string;
  setup: string;
  notes: string;
}

const INTEGRATION_GUIDES: Record<string, IntegrationGuide> = {
  javascript: {
    label: "JavaScript (Node.js / Bun)",
    emoji: "🟨",
    language: "JavaScript",
    setup: "npm install axios # or: bun add axios",
    code: `const axios = require('axios');
// OR: import axios from 'axios';

const API_KEY = 'YOUR_API_KEY_HERE';
const BASE_URL = 'http://localhost:4000';

async function validateToken() {
  try {
    const response = await axios.post(\`\${BASE_URL}/validate\`, {
      guildId: 'YOUR_GUILD_ID',
    }, {
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json',
      },
    });
    console.log('✅ Valid:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}
validateToken();`,
    notes:
      "Works with Node.js 18+, Bun, and Deno. For JWT, use `jsonwebtoken` to verify locally.",
  },
  typescript: {
    label: "TypeScript (Node.js / Bun)",
    emoji: "🔷",
    language: "TypeScript",
    setup: "npm install axios # or: bun add axios",
    code: `import axios, { AxiosResponse } from 'axios';

const API_KEY: string = 'YOUR_API_KEY_HERE';
const BASE_URL: string = 'http://localhost:4000';

interface ValidateResponse {
  valid: boolean;
  type: 'api_key' | 'jwt';
  payload?: {
    userId: string;
    guildId: string;
    permissions: string;
  };
}

async function validateToken(): Promise<ValidateResponse | null> {
  try {
    const response: AxiosResponse<ValidateResponse> = await axios.post(
      \`\${BASE_URL}/validate\`,
      { guildId: 'YOUR_GUILD_ID' },
      {
        headers: {
          'Authorization': \`Bearer \${API_KEY}\`,
          'Content-Type': 'application/json',
        },
      },
    );
    console.log('✅ Valid:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
    return null;
  }
}
validateToken();`,
    notes: "Full type safety. Use `axios` or `fetch` (built-in in Node 18+).",
  },
  python: {
    label: "Python",
    emoji: "🐍",
    language: "Python",
    setup: "pip install requests",
    code: `import requests
import json

API_KEY = "YOUR_API_KEY_HERE"
BASE_URL = "http://localhost:4000"

def validate_token():
    try:
        response = requests.post(
            f"{BASE_URL}/validate",
            json={"guildId": "YOUR_GUILD_ID"},
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            },
        )
        data = response.json()
        if data.get("valid"):
            print(f"✅ Valid! Permissions: {data['payload']['permissions']}")
        else:
            print(f"❌ Invalid: {data.get('error')}")
        return data
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

validate_token()`,
    notes:
      "Works with Python 3.7+. Use `requests` library or built-in `urllib`.",
  },
  csharp: {
    label: "C# (.NET)",
    emoji: "🔷",
    language: "C#",
    setup: "dotnet add package Newtonsoft.Json",
    code: `using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

class Program
{
    private static readonly string API_KEY = "YOUR_API_KEY_HERE";
    private static readonly string BASE_URL = "http://localhost:4000";

    static async Task Main()
    {
        using var client = new HttpClient();
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {API_KEY}");

        var payload = new { guildId = "YOUR_GUILD_ID" };
        var json = JsonConvert.SerializeObject(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        try
        {
            var response = await client.PostAsync($"{BASE_URL}/validate", content);
            var result = await response.Content.ReadAsStringAsync();
            var data = JsonConvert.DeserializeObject(result);
            Console.WriteLine($"✅ Response: {result}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error: {ex.Message}");
        }
    }
}`,
    notes:
      "Target .NET 6+. Uses `HttpClient` (remember to dispose properly in production).",
  },
  java: {
    label: "Java",
    emoji: "☕",
    language: "Java",
    setup:
      "// Add to pom.xml:\n// <dependency>\n//   <groupId>com.squareup.okhttp3</groupId>\n//   <artifactId>okhttp</artifactId>\n//   <version>4.12.0</version>\n// </dependency>",
    code: `import okhttp3.*;
import org.json.JSONObject;
import java.io.IOException;

public class RegixAuth {
    private static final String API_KEY = "YOUR_API_KEY_HERE";
    private static final String BASE_URL = "http://localhost:4000";

    public static void main(String[] args) throws IOException {
        OkHttpClient client = new OkHttpClient();

        JSONObject json = new JSONObject();
        json.put("guildId", "YOUR_GUILD_ID");

        RequestBody body = RequestBody.create(
            json.toString(),
            MediaType.parse("application/json")
        );

        Request request = new Request.Builder()
            .url(BASE_URL + "/validate")
            .addHeader("Authorization", "Bearer " + API_KEY)
            .post(body)
            .build();

        try (Response response = client.newCall(request).execute()) {
            String result = response.body().string();
            System.out.println("✅ Response: " + result);
        } catch (Exception e) {
            System.err.println("❌ Error: " + e.getMessage());
        }
    }
}`,
    notes: "Requires OkHttp + org.json libraries. Java 11+ recommended.",
  },
  go: {
    label: "Go (Golang)",
    emoji: "🔵",
    language: "Go",
    setup: "go get github.com/go-resty/resty/v2",
    code: `package main

import (
    "fmt"
    "github.com/go-resty/resty/v2"
)

const (
    API_KEY  = "YOUR_API_KEY_HERE"
    BASE_URL = "http://localhost:4000"
)

type ValidateResponse struct {
    Valid   bool   \`json:"valid"\`
    Type    string \`json:"type"\`
    Payload struct {
        UserId      string \`json:"userId"\`
        GuildId     string \`json:"guildId"\`
        Permissions string \`json:"permissions"\`
    } \`json:"payload"\`
}

func main() {
    client := resty.New()
    var result ValidateResponse

    resp, err := client.R().
        SetHeader("Authorization", "Bearer "+API_KEY).
        SetBody(map[string]string{"guildId": "YOUR_GUILD_ID"}).
        SetResult(&result).
        Post(BASE_URL + "/validate")

    if err != nil {
        fmt.Printf("❌ Error: %v\\n", err)
        return
    }

    if resp.IsSuccess() {
        fmt.Printf("✅ Valid! Permissions: %s\\n", result.Payload.Permissions)
    } else {
        fmt.Printf("❌ Failed: %s\\n", resp.String())
    }
}`,
    notes:
      "Uses `resty/v2` HTTP client. Also works with standard `net/http` package.",
  },
  rust: {
    label: "Rust",
    emoji: "🦀",
    language: "Rust",
    setup: `# Add to Cargo.toml:
# [dependencies]
# reqwest = { version = "0.12", features = ["json"] }
# serde = { version = "1", features = ["derive"] }
# tokio = { version = "1", features = ["full"] }`,
    code: `use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::error::Error;

#[derive(Debug, Serialize)]
struct ValidateRequest {
    guild_id: String,
}

#[derive(Debug, Deserialize)]
struct ValidateResponse {
    valid: bool,
    #[serde(rename = "type")]
    resp_type: Option<String>,
    payload: Option<Payload>,
}

#[derive(Debug, Deserialize)]
struct Payload {
    user_id: String,
    guild_id: String,
    permissions: String,
}

const API_KEY: &str = "YOUR_API_KEY_HERE";
const BASE_URL: &str = "http://localhost:4000";

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let client = Client::new();

    let response = client
        .post(format!("{}/validate", BASE_URL))
        .header("Authorization", format!("Bearer {}", API_KEY))
        .json(&ValidateRequest {
            guild_id: "YOUR_GUILD_ID".to_string(),
        })
        .send()
        .await?
        .json::<ValidateResponse>()
        .await?;

    if response.valid {
        println!("✅ Valid! {:?}", response);
    } else {
        println!("❌ Invalid");
    }
    Ok(())
}`,
    notes:
      "Uses `reqwest` HTTP client. Async runtime: `tokio`. Rust edition 2021+.",
  },
  php: {
    label: "PHP",
    emoji: "🐘",
    language: "PHP",
    setup: "composer require guzzlehttp/guzzle",
    code: `<?php
require_once 'vendor/autoload.php';

use GuzzleHttp\\Client;
use GuzzleHttp\\Exception\\GuzzleException;

define('API_KEY', 'YOUR_API_KEY_HERE');
define('BASE_URL', 'http://localhost:4000');

function validateToken() {
    $client = new Client();

    try {
        $response = $client->post(BASE_URL . '/validate', [
            'headers' => [
                'Authorization' => 'Bearer ' . API_KEY,
                'Content-Type' => 'application/json',
            ],
            'json' => [
                'guildId' => 'YOUR_GUILD_ID',
            ],
        ]);

        $data = json_decode($response->getBody(), true);
        echo "✅ Valid: " . json_encode($data, JSON_PRETTY_PRINT);
        return $data;
    } catch (GuzzleException $e) {
        echo "❌ Error: " . $e->getMessage();
        return null;
    }
}

validateToken();`,
    notes:
      "PHP 8.0+. Uses GuzzleHttp client. Also works with `file_get_contents` + stream context.",
  },
  ruby: {
    label: "Ruby",
    emoji: "💎",
    language: "Ruby",
    setup: "gem install httparty",
    code: `require 'httparty'
require 'json'

API_KEY = 'YOUR_API_KEY_HERE'
BASE_URL = 'http://localhost:4000'

def validate_token
  response = HTTParty.post(
    "\#{BASE_URL}/validate",
    headers: {
      'Authorization' => "Bearer \#{API_KEY}",
      'Content-Type' => 'application/json',
    },
    body: { guildId: 'YOUR_GUILD_ID' }.to_json,
  )

  if response.success?
    data = JSON.parse(response.body)
    puts "✅ Valid! Permissions: \#{data['payload']['permissions']}"
    data
  else
    puts "❌ Error: \#{response['error']}"
    nil
  end
rescue StandardError => e
  puts "❌ Exception: \#{e.message}"
end

validate_token`,
    notes:
      "Ruby 3.0+. Uses `httparty` gem. Also works with built-in `net/http`.",
  },
  "c++": {
    label: "C++ (cpp-httplib)",
    emoji: "⚡",
    language: "C++",
    setup: `# Download cpp-httplib:
# wget https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h`,
    code: `#include <iostream>
#include "httplib.h"
#include <nlohmann/json.hpp>

using json = nlohmann::json;
using namespace httplib;

const std::string API_KEY = "YOUR_API_KEY_HERE";
const std::string BASE_URL = "http://localhost:4000";

int main() {
    Client cli(BASE_URL);

    json body;
    body["guildId"] = "YOUR_GUILD_ID";

    auto res = cli.Post("/validate",
        body.dump(),
        "application/json"
    );

    if (res && res->status == 200) {
        auto response = json::parse(res->body);
        std::cout << "✅ Valid: " << response.dump(2) << std::endl;
    } else {
        std::cout << "❌ Error: " << (res ? res->body : "No response") << std::endl;
    }
    return 0;
}`,
    notes: "Requires `cpp-httplib` and `nlohmann/json` libraries. C++17+.",
  },
  swift: {
    label: "Swift",
    emoji: "🍎",
    language: "Swift",
    setup:
      '// Swift Package Manager:\n// .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.9.0")',
    code: `import Foundation
import Alamofire

let apiKey = "YOUR_API_KEY_HERE"
let baseURL = "http://localhost:4000"

func validateToken() {
    let headers: HTTPHeaders = [
        "Authorization": "Bearer \\(apiKey)",
        "Content-Type": "application/json",
    ]

    let parameters: [String: String] = [
        "guildId": "YOUR_GUILD_ID",
    ]

    AF.request("\\(baseURL)/validate",
        method: .post,
        parameters: parameters,
        encoding: JSONEncoding.default,
        headers: headers
    ).responseDecodable(of: ValidateResponse.self) { response in
        switch response.result {
        case .success(let data):
            print("✅ Valid: \\(data)")
        case .failure(let error):
            print("❌ Error: \\(error)")
        }
    }
}

struct ValidateResponse: Decodable {
    let valid: Bool
    let type: String?
    let payload: Payload?
}

struct Payload: Decodable {
    let userId: String
    let guildId: String
    let permissions: String
}

validateToken()`,
    notes: "Swift 5.5+. Uses Alamofire. Also works with built-in `URLSession`.",
  },
  kotlin: {
    label: "Kotlin",
    emoji: "🟣",
    language: "Kotlin",
    setup: `// Add to build.gradle.kts:
// implementation("com.squareup.okhttp3:okhttp:4.12.0")
// implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")`,
    code: `import okhttp3.*
import kotlinx.serialization.*
import kotlinx.serialization.json.*

val API_KEY = "YOUR_API_KEY_HERE"
val BASE_URL = "http://localhost:4000"

@Serializable
data class ValidateResponse(
    val valid: Boolean,
    val type: String? = null,
    val payload: Payload? = null,
)

@Serializable
data class Payload(
    val userId: String,
    val guildId: String,
    val permissions: String,
)

suspend fun validateToken() {
    val client = OkHttpClient()
    val json = Json { ignoreUnknownKeys = true }

    val body = buildJsonObject {
        put("guildId", "YOUR_GUILD_ID")
    }

    val request = Request.Builder()
        .url("\$BASE_URL/validate")
        .addHeader("Authorization", "Bearer \$API_KEY")
        .post(body.toString().toMediaType("application/json"))
        .build()

    client.newCall(request).execute().use { response ->
        val result = json.decodeFromString<ValidateResponse>(
            response.body?.string() ?: "{}"
        )
        if (result.valid) {
            println("✅ Valid: \$result")
        } else {
            println("❌ Invalid")
        }
    }
}`,
    notes:
      "Kotlin 1.9+. Uses OkHttp + kotlinx.serialization. Coroutines required.",
  },
  "react-native": {
    label: "React Native",
    emoji: "📱",
    language: "React Native",
    setup: "npm install axios",
    code: `import axios from 'axios';
import { Alert } from 'react-native';

const API_KEY = 'YOUR_API_KEY_HERE';
const BASE_URL = 'http://YOUR_SERVER_IP:4000';

export async function validateRegixToken() {
  try {
    const response = await axios.post(
      \`\${BASE_URL}/validate\`,
      { guildId: 'YOUR_GUILD_ID' },
      {
        headers: {
          'Authorization': \`Bearer \${API_KEY}\`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      },
    );

    if (response.data.valid) {
      Alert.alert('✅ Success', 'Token is valid!');
      return response.data;
    }
  } catch (error: any) {
    Alert.alert('❌ Error', error.response?.data?.error || error.message);
    return null;
  }
}`,
    notes:
      "Use `10.0.2.2` for Android emulator, or your machine's LAN IP for physical devices.",
  },
  flutter: {
    label: "Flutter / Dart",
    emoji: "🦋",
    language: "Dart",
    setup: `# Add to pubspec.yaml:
# dependencies:
#   http: ^1.2.0`,
    code: `import 'package:http/http.dart' as http;
import 'dart:convert';

const String apiKey = 'YOUR_API_KEY_HERE';
const String baseUrl = 'http://localhost:4000';

Future<void> validateToken() async {
  try {
    final response = await http.post(
      Uri.parse('$baseUrl/validate'),
      headers: {
        'Authorization': 'Bearer $apiKey',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'guildId': 'YOUR_GUILD_ID',
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      print('✅ Valid: \${data['payload']}');
    } else {
      print('❌ Error: \${response.body}');
    }
  } catch (e) {
    print('❌ Exception: \$e');
  }
}`,
    notes:
      "Dart 3.0+. Uses `http` package. Works on Android, iOS, Web, and Desktop.",
  },
  "unity-csharp": {
    label: "Unity (C#)",
    emoji: "🎮",
    language: "C# (Unity)",
    setup: "// Uses built-in UnityWebRequest\n// No additional packages needed",
    code: `using UnityEngine;
using UnityEngine.Networking;
using System.Collections;
using Newtonsoft.Json.Linq;

public class RegixAuth : MonoBehaviour
{
    private const string API_KEY = "YOUR_API_KEY_HERE";
    private const string BASE_URL = "http://localhost:4000";

    void Start() => StartCoroutine(ValidateToken());

    IEnumerator ValidateToken()
    {
        var json = new JObject();
        json["guildId"] = "YOUR_GUILD_ID";

        byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(json.ToString());
        using var request = new UnityWebRequest(BASE_URL + "/validate", "POST");
        request.uploadHandler = new UploadHandlerRaw(bodyRaw);
        request.downloadHandler = new DownloadHandlerBuffer();
        request.SetRequestHeader("Authorization", $"Bearer {API_KEY}");
        request.SetRequestHeader("Content-Type", "application/json");

        yield return request.SendWebRequest();

        if (request.result == UnityWebRequest.Result.Success)
        {
            var data = JObject.Parse(request.downloadHandler.text);
            Debug.Log($"✅ Valid: {data}");
        }
        else
        {
            Debug.LogError($"❌ Error: {request.error}");
        }
    }
}`,
    notes:
      "Uses UnityWebRequest (built-in). Requires Newtonsoft.Json for Unity package.",
  },
  curl: {
    label: "cURL (Command Line)",
    emoji: "💻",
    language: "cURL",
    setup:
      "curl is pre-installed on macOS/Linux. Download for Windows from curl.se",
    code: `# ─── Validate API Key ─────────────────────────────────────────
curl -X POST http://localhost:4000/validate \\
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{"guildId": "YOUR_GUILD_ID"}'

# ─── Validate JWT ────────────────────────────────────────────
curl -X POST http://localhost:4000/validate \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{"guildId": "YOUR_GUILD_ID"}'

# ─── Health Check ────────────────────────────────────────────
curl http://localhost:4000/health

# ─── Get API Key Info (Admin only) ───────────────────────────
curl -X GET http://localhost:4000/keys/rgx_abc123 \\
  -H "Authorization: Bearer YOUR_ADMIN_KEY_HERE"`,
    notes:
      "Great for testing and scripting. Use `-v` flag for verbose output with full headers.",
  },
};

// ─── Language choice labels for the dropdown ─────────────────────────────
const LANGUAGE_CHOICES = Object.entries(INTEGRATION_GUIDES).map(
  ([key, val]) => ({
    name: `${val.emoji} ${val.label}`,
    value: key,
  }),
);

// Add the custom option at the end
const ALL_CHOICES = [
  ...LANGUAGE_CHOICES,
  {
    name: "✨ Custom Language (type your own in extra-languages)",
    value: "custom",
  },
];

const command: HybridCommand = {
  name: "auth",
  description: "Manage API keys, JWT tokens, and authentication configuration.",
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  options: [
    {
      name: "generate",
      description:
        "Generate API key + JWT with step-by-step integration guide.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "name",
          description: "A human-readable name for this API key.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "language",
          description: "Primary language/framework for integration guide.",
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: ALL_CHOICES,
        },
        {
          name: "extra-languages",
          description:
            "Additional languages (comma-separated: python,java,go) OR custom language name.",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "expires-in",
          description: "Token expiration (e.g., 24h, 7d, 30m). Default: 24h.",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "scopes",
          description:
            "Permission scopes (comma-separated). Default: read. Options: read, write, admin",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: "reset",
      description:
        "Revoke your current API key and JWT, then issue a fresh set.",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "get",
      description:
        "Securely display your active API key, JWT, rate limits, and remaining validity.",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "customize",
      description:
        "Customize security constraints for your tokens (rate limits, IP whitelist).",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "rate-limit",
          description: "Max requests per minute. Default: 60.",
          type: ApplicationCommandOptionType.Integer,
          required: false,
        },
        {
          name: "ip-whitelist",
          description:
            "Comma-separated IP addresses to whitelist. Leave empty to allow all.",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
  ],

  async execute(context) {
    const { interaction, reply } = context;
    if (!interaction) return;

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (!guildId) {
      await reply({
        content: "❌ This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // ── /auth generate ────────────────────────────────────────────────────
    if (subcommand === "generate") {
      const name = interaction.options.getString("name", true);
      const languageKey = interaction.options.getString("language", true);
      const extraLanguagesRaw =
        interaction.options.getString("extra-languages") ?? "";
      const expiresIn = interaction.options.getString("expires-in") ?? "24h";
      const scopes = interaction.options.getString("scopes") ?? "read";

      // Validate scopes
      const validScopes = ["read", "write", "admin"];
      const requestedScopes = scopes
        .split(",")
        .map((s) => s.trim().toLowerCase());
      const invalidScopes = requestedScopes.filter(
        (s) => !validScopes.includes(s),
      );
      if (invalidScopes.length > 0) {
        await reply({
          content: `❌ Invalid scope(s): ${invalidScopes.join(", ")}. Valid scopes: read, write, admin.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const primaryScope = requestedScopes[0] ?? "read";

      // ── Resolve all selected languages ──────────────────────────────────
      const selectedKeys: string[] = [];
      const customLanguages: string[] = [];

      // Main language
      if (languageKey === "custom") {
        // If custom is chosen, the extra-languages field becomes the custom name
        const customName = extraLanguagesRaw.trim();
        if (customName) {
          customLanguages.push(customName);
        } else {
          await reply({
            content:
              "❌ You selected **Custom Language** but didn't provide a name. Please type your custom language name in the `extra-languages` field.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      } else if (INTEGRATION_GUIDES[languageKey]) {
        selectedKeys.push(languageKey);
      } else {
        await reply({
          content: `❌ Invalid language selection. Please choose a valid language.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Extra languages (comma-separated)
      if (extraLanguagesRaw.trim()) {
        const extras = extraLanguagesRaw
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);

        for (const extra of extras) {
          if (INTEGRATION_GUIDES[extra]) {
            if (!selectedKeys.includes(extra)) {
              selectedKeys.push(extra);
            }
          } else if (extra !== languageKey) {
            // Treat as custom language
            if (!customLanguages.includes(extra)) {
              customLanguages.push(extra);
            }
          }
        }
      }

      // If no valid languages resolved
      if (selectedKeys.length === 0 && customLanguages.length === 0) {
        await reply({
          content:
            "❌ No valid languages selected. Please choose at least one language.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Step 1: Generate API Key
      const keyResult = await createApiKey({
        name,
        ownerId: userId,
        guildId,
        description: `Languages: ${[...selectedKeys.map((k) => INTEGRATION_GUIDES[k]?.label || k), ...customLanguages].join(", ")} | Scopes: ${scopes}`,
        permissions: primaryScope,
        rateLimit: 60,
        rateLimitWindow: 60000,
      });

      if (!keyResult.success || !keyResult.key) {
        await reply({
          content: `❌ Failed to generate API key: ${keyResult.error}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Step 2: Ensure JWT config exists, then generate JWT
      const jwtConfig = await getJwtConfig(guildId);
      let jwtResult;
      if (!jwtConfig) {
        const defaultSecret = `rgx-jwt-${randomBytes(32).toString("hex")}`;
        await upsertJwtConfig(guildId, {
          secret: defaultSecret,
          expiresIn,
          issuer: "regix-auth",
          audience: guildId,
        });
        jwtResult = await generateToken(guildId, userId, primaryScope);
      } else {
        jwtResult = await generateToken(guildId, userId, primaryScope);
      }

      if (!jwtResult.success || !jwtResult.token) {
        await reply({
          content: `❌ API key created but JWT generation failed: ${jwtResult.error}. Use \`/auth customize\` to set up JWT first.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await logAudit({
        action: "auth.generate",
        actorId: userId,
        targetId: keyResult.keyPrefix,
        details: JSON.stringify({
          name,
          scopes,
          expiresIn,
          languages: [...selectedKeys, ...customLanguages],
        }),
        ip: "discord",
      });

      // ── Build language list string for embed ────────────────────────────
      const allGuides = selectedKeys.map((k) => INTEGRATION_GUIDES[k]);
      const langListStr = [
        ...allGuides.map((g) => `${g.emoji} **${g.label}**`),
        ...customLanguages.map((c) => `✨ **${c}** (Custom)`),
      ].join(", ");

      // ── Embed 1: Tokens ────────────────────────────────────────────────
      const tokenEmbed = new EmbedBuilder()
        .setTitle(
          `🔑 **Tokens Generated — ${allGuides.length + customLanguages.length} Language(s)**`,
        )
        .setDescription(
          "⚠️ **These credentials will only be shown once!** Copy them now and store them securely.\n\n" +
            "**How to authenticate:**\n" +
            "```\n" +
            "Authorization: Bearer <your_token>\n" +
            "```\n" +
            "Use the **API Key** for long-lived native apps.\n" +
            "Use the **JWT** for short-lived web sessions.\n\n" +
            `**Selected Languages:** ${langListStr}`,
        )
        .setColor("Green")
        .addFields(
          {
            name: "━━━ 🔑 **Secret API Key** (Long-Lived) ━━━",
            value: `\`\`\`\n${keyResult.key}\n\`\`\``,
            inline: false,
          },
          {
            name: "🔖 **Prefix**",
            value: `\`${keyResult.keyPrefix}\``,
            inline: true,
          },
          { name: "📛 **Name**", value: name, inline: true },
          { name: "🎯 **Scopes**", value: scopes, inline: true },
          {
            name: "🌐 **Languages**",
            value: String(allGuides.length + customLanguages.length),
            inline: true,
          },
          {
            name: "━━━ 🔐 **JWT Token** (Short-Lived) ━━━",
            value: `\`\`\`\n${jwtResult.token}\n\`\`\``,
            inline: false,
          },
          {
            name: "⏰ **Expires In**",
            value: expiresIn,
            inline: true,
          },
          {
            name: "⚡ **Rate Limit**",
            value: "60 req/min",
            inline: true,
          },
        )
        .setFooter({
          text: `REGIX Studio • Auth System • ${allGuides.length + customLanguages.length} integration guide(s) below`,
        })
        .setTimestamp();

      // ── Build integration guide embeds ─────────────────────────────────
      const guideEmbeds: EmbedBuilder[] = [];

      for (const guide of allGuides) {
        const guideEmbed = new EmbedBuilder()
          .setTitle(`📖 **Integration Guide — ${guide.emoji} ${guide.label}**`)
          .setDescription(
            `Step-by-step guide to integrate REGIX Auth into your **${guide.language}** application.`,
          )
          .setColor("Blue")
          .addFields(
            {
              name: "📦 **1. Install Dependencies**",
              value: `\`\`\`bash\n${guide.setup}\n\`\`\``,
              inline: false,
            },
            {
              name: "💻 **2. Demo Code**",
              value: `\`\`\`${guide.language === "cURL" ? "bash" : guide.language.toLowerCase()}\n${guide.code}\n\`\`\``,
              inline: false,
            },
            {
              name: "📝 **3. Quick Start Steps**",
              value:
                "1️⃣ Copy your **API Key** or **JWT** from the first embed\n" +
                "2️⃣ Replace `YOUR_API_KEY_HERE` with your actual key\n" +
                "3️⃣ Replace `YOUR_GUILD_ID` with your Discord server ID\n" +
                `4️⃣ Run: \`${
                  guide.language === "cURL" ? "curl ..."
                  : (
                    guide.language === "JavaScript" ||
                    guide.language === "TypeScript"
                  ) ?
                    "node app.js"
                  : guide.language === "Python" ? "python app.py"
                  : guide.language === "Go" ? "go run main.go"
                  : guide.language === "Rust" ? "cargo run"
                  : guide.language === "C#" ? "dotnet run"
                  : "Run your project"
                }\``,
              inline: false,
            },
            {
              name: "⚠️ **Notes**",
              value: guide.notes,
              inline: false,
            },
            {
              name: "🔗 **API Endpoints**",
              value:
                "• `POST /validate` — Validate token\n" +
                "• `GET /keys/:prefix` — Get key info (admin)\n" +
                "• `GET /health` — Health check\n" +
                "• Base URL: `http://localhost:4000`",
              inline: false,
            },
          )
          .setFooter({
            text: `REGIX Studio • Auth System • Guide ${guideEmbeds.length + 1} of ${allGuides.length + customLanguages.length}`,
          })
          .setTimestamp();
        guideEmbeds.push(guideEmbed);
      }

      // Custom language guides
      for (const customLang of customLanguages) {
        const customEmbed = new EmbedBuilder()
          .setTitle(`📖 **Integration Guide — ✨ ${customLang}**`)
          .setDescription(
            `Custom integration for **${customLang}**. Below is a generic REST API guide that works with any language.`,
          )
          .setColor("Purple")
          .addFields(
            {
              name: "📝 **Generic REST API Integration**",
              value:
                "Since you selected a custom language, here's the universal REST API guide:\n\n" +
                "**Endpoint:** `POST /validate`\n" +
                "**Headers:**\n" +
                "```\n" +
                "Authorization: Bearer YOUR_API_KEY_HERE\n" +
                "Content-Type: application/json\n" +
                "```\n" +
                "**Body:**\n" +
                "```json\n" +
                '{"guildId": "YOUR_DISCORD_GUILD_ID"}\n' +
                "```\n" +
                "**Success Response (200):**\n" +
                "```json\n" +
                '{"valid": true, "type": "api_key", "payload": {...}}\n' +
                "```\n" +
                "**Error Response (401):**\n" +
                "```json\n" +
                '{"valid": false, "error": "Invalid token"}\n' +
                "```",
              inline: false,
            },
            {
              name: "💻 **cURL Example (Test First)**",
              value:
                "```bash\n" +
                `curl -X POST http://localhost:4000/validate \\\n` +
                `  -H "Authorization: Bearer YOUR_API_KEY_HERE" \\\n` +
                `  -H "Content-Type: application/json" \\\n` +
                `  -d '{"guildId": "YOUR_GUILD_ID"}'\n` +
                "```",
              inline: false,
            },
            {
              name: "⚠️ **Tips for Custom Languages**",
              value:
                "• Use any HTTP client library available for your language\n" +
                "• Send POST requests with JSON body and Bearer auth header\n" +
                "• For JWT verification, find a JWT library for your language\n" +
                "• Check the auth-server source for more advanced usage",
              inline: false,
            },
          )
          .setFooter({
            text: `REGIX Studio • Auth System • Guide ${guideEmbeds.length + 1} of ${allGuides.length + customLanguages.length}`,
          })
          .setTimestamp();
        guideEmbeds.push(customEmbed);
      }

      // Send all embeds (max 10 per message, Discord limit)
      const allEmbeds = [tokenEmbed, ...guideEmbeds];
      const maxEmbedsPerMessage = 10;

      // Send first batch
      await reply({
        embeds: allEmbeds.slice(0, maxEmbedsPerMessage),
        flags: MessageFlags.Ephemeral,
      });

      // Send remaining batches as follow-ups if more than 10 guides
      if (allEmbeds.length > maxEmbedsPerMessage) {
        for (
          let i = maxEmbedsPerMessage;
          i < allEmbeds.length;
          i += maxEmbedsPerMessage
        ) {
          const batch = allEmbeds.slice(i, i + maxEmbedsPerMessage);
          // Use followUp via the interaction
          try {
            await (interaction as any).followUp({
              embeds: batch,
              ephemeral: true,
            });
          } catch {
            // Fallback: just log and continue
            console.log(
              `[Auth] Sent guide batch ${i / maxEmbedsPerMessage + 1}`,
            );
          }
        }
      }
      return;
    }

    // ── /auth reset ───────────────────────────────────────────────────────
    if (subcommand === "reset") {
      const userKeys = await listApiKeys(userId);
      const activeKeys = userKeys.filter((k) => k.isActive);

      if (activeKeys.length === 0) {
        await reply({
          content: "ℹ️ You don't have any active API keys to revoke.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      let revokedCount = 0;
      for (const key of activeKeys) {
        const success = await revokeApiKey(key.id);
        if (success) revokedCount++;
      }

      const freshKeyResult = await createApiKey({
        name: `${interaction.user.username}-key-${Date.now()}`,
        ownerId: userId,
        guildId,
        description: "Auto-generated after reset",
        permissions: "read",
        rateLimit: 60,
        rateLimitWindow: 60000,
      });

      if (!freshKeyResult.success || !freshKeyResult.key) {
        await reply({
          content: `✅ Revoked ${revokedCount} key(s), but failed to generate new key: ${freshKeyResult.error}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const jwtConfig = await getJwtConfig(guildId);
      let freshJwtResult;
      if (jwtConfig) {
        freshJwtResult = await generateToken(guildId, userId, "read");
      }

      await logAudit({
        action: "auth.reset",
        actorId: userId,
        targetId: freshKeyResult.keyPrefix,
        details: JSON.stringify({
          revokedCount,
          newKeyPrefix: freshKeyResult.keyPrefix,
        }),
        ip: "discord",
      });

      const embed = new EmbedBuilder()
        .setTitle("🔄 **Tokens Reset Successfully**")
        .setDescription(
          `✅ Revoked ${revokedCount} old key(s).\n` +
            "⚠️ **New credentials shown below — copy them now!**\n\n" +
            "**How to use:**\n" +
            "```\n" +
            "Authorization: Bearer <your_token>\n" +
            "```",
        )
        .setColor("Blue")
        .addFields(
          {
            name: "━━━ 🔑 **New API Key** ━━━",
            value: `\`\`\`\n${freshKeyResult.key}\n\`\`\``,
            inline: false,
          },
          {
            name: "🔖 **Prefix**",
            value: `\`${freshKeyResult.keyPrefix}\``,
            inline: true,
          },
          { name: "⚡ **Rate Limit**", value: "60 req/min", inline: true },
          ...(freshJwtResult?.token ?
            [
              {
                name: "━━━ 🔐 **New JWT** ━━━" as const,
                value: `\`\`\`\n${freshJwtResult.token}\n\`\`\``,
                inline: false,
              },
            ]
          : []),
        )
        .setFooter({ text: "REGIX Studio • Auth System" })
        .setTimestamp();

      await reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    // ── /auth get ─────────────────────────────────────────────────────────
    if (subcommand === "get") {
      const keys = await listApiKeys(userId);
      const activeKeys = keys.filter((k) => k.isActive);

      if (activeKeys.length === 0) {
        await reply({
          content:
            "ℹ️ You don't have any active API keys. Use `/auth generate` to create one.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const jwtConfig = await getJwtConfig(guildId);

      const embed = new EmbedBuilder()
        .setTitle("🔐 **Your Auth Credentials**")
        .setDescription(
          "Below is a summary of your active authentication credentials and their current status.",
        )
        .setColor("Blue")
        .addFields(
          {
            name: "━━━ 🔑 **Active API Keys** ━━━",
            value: activeKeys
              .map(
                (k) =>
                  `**${k.name}** (\`${k.keyPrefix}...\`)\n` +
                  `• 🎯 Permissions: \`${k.permissions}\`\n` +
                  `• ⚡ Rate Limit: ${k.rateLimit} req/min\n` +
                  `• 🔒 IP Whitelist: ${k.ipWhitelist || "None (all IPs allowed)"}\n` +
                  `• 📅 Created: <t:${Math.floor(k.createdAt.getTime() / 1000)}:R>\n` +
                  `• 🔄 Last Used: ${k.lastUsedAt ? `<t:${Math.floor(k.lastUsedAt.getTime() / 1000)}:R>` : "Never"}\n` +
                  `• ⏰ Expires: ${k.expiresAt ? `<t:${Math.floor(k.expiresAt.getTime() / 1000)}:R>` : "Never (long-lived)"}`,
              )
              .join("\n\n"),
            inline: false,
          },
          ...(jwtConfig ?
            [
              {
                name: "━━━ 🔐 **JWT Configuration** ━━━" as const,
                value:
                  `• ✅ Status: ${jwtConfig.isActive ? "✅ Active" : "❌ Inactive"}\n` +
                  `• ⏰ Expires In: \`${jwtConfig.expiresIn}\`\n` +
                  `• 🏢 Issuer: \`${jwtConfig.issuer}\`\n` +
                  `• 👥 Audience: \`${jwtConfig.audience || "Not set"}\`\n` +
                  `• ⚡ Validation Rate Limit: ${jwtConfig.rateLimit} req/${jwtConfig.rateLimitWindow / 1000}s`,
                inline: false,
              },
            ]
          : []),
        )
        .setFooter({ text: "REGIX Studio • Auth System" })
        .setTimestamp();

      await reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    // ── /auth customize ───────────────────────────────────────────────────
    if (subcommand === "customize") {
      const rateLimit = interaction.options.getInteger("rate-limit");
      const ipWhitelist = interaction.options.getString("ip-whitelist");

      if (!rateLimit && ipWhitelist === null) {
        await reply({
          content:
            "ℹ️ Please specify at least one option to customize: `rate-limit` or `ip-whitelist`.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const keys = await listApiKeys(userId);
      const latestActiveKey = keys.find((k) => k.isActive);

      if (!latestActiveKey) {
        await reply({
          content:
            "❌ No active API key found. Use `/auth generate` to create one first.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const updateData: {
        rateLimit?: number;
        ipWhitelist?: string;
      } = {};

      if (rateLimit !== null && rateLimit !== undefined) {
        if (rateLimit < 1 || rateLimit > 10000) {
          await reply({
            content:
              "❌ Rate limit must be between 1 and 10,000 requests per minute.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        updateData.rateLimit = rateLimit;
      }

      if (ipWhitelist !== null && ipWhitelist !== undefined) {
        if (ipWhitelist.trim() === "") {
          updateData.ipWhitelist = "";
        } else {
          const ips = ipWhitelist
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          const ipRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(\/\d{1,2})?$/;
          const invalidIps = ips.filter((ip) => !ipRegex.test(ip));
          if (invalidIps.length > 0) {
            await reply({
              content: `❌ Invalid IP(s): ${invalidIps.join(", ")}. Use valid IPv4 addresses or CIDR notation (e.g., 192.168.1.1 or 10.0.0.0/24).`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          updateData.ipWhitelist = ips.join(",");
        }
      }

      const result = await updateApiKey(latestActiveKey.id, updateData);

      if (!result.success) {
        await reply({
          content: `❌ Failed to update configuration: ${result.error}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await logAudit({
        action: "auth.customize",
        actorId: userId,
        targetId: latestActiveKey.id,
        details: JSON.stringify(updateData),
        ip: "discord",
      });

      const changes = [];
      if (updateData.rateLimit !== undefined)
        changes.push(`• ⚡ Rate Limit → ${updateData.rateLimit} req/min`);
      if (updateData.ipWhitelist !== undefined)
        changes.push(
          `• 🔒 IP Whitelist → ${updateData.ipWhitelist || "All IPs allowed (disabled)"}`,
        );

      await reply({
        content:
          `✅ **Security configuration updated successfully!**\n\n` +
          changes.join("\n"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await reply({
      content: "❌ Unknown subcommand.",
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
