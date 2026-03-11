class AIAgentProvider {
    constructor(llmClient) {
        this.llmClient = llmClient;
    }

    async executeLocalLogic(structure, testData) {
        // Here we simulate the pipeline execution with test data
        // For security and simplicity, we just use the existing tools
        
        let currentData = [...testData];
        let executionLog = [];

        try {
            const blocks = Array.isArray(structure) ? structure : structure.blocks;
            
            for (const block of blocks) {
                if (block.type === 'source') {
                    // source block uses its own text, we override with test_data if it's the first block
                    // But actually it's better to just pass testData to the first processing block
                    continue;
                }

                const toolsList = typeof window !== 'undefined' && window.TOOLS ? window.TOOLS : (typeof TOOLS !== 'undefined' ? TOOLS : []);
                const toolDef = toolsList.find(t => t.id === block.type);
                if (toolDef) {
                    const params = block.params || block.data || {};
                    const result = await toolDef.process(currentData, params, null, null);
                    if (result && result.result) {
                        currentData = result.result;
                        executionLog.push({ type: block.type, status: 'ok', output: currentData.slice(0, 5) });
                    } else if (result && result.stats && result.stats.msg) {
                         executionLog.push({ type: block.type, status: 'warning', msg: result.stats.msg });
                    }
                } else {
                    executionLog.push({ type: block.type, status: 'error', msg: 'Tool not found' });
                }
            }
            console.log("--- Chain Execution Result ---", { status: 'ok', final_output: currentData, log: executionLog });
            return { status: 'ok', final_output: currentData, log: executionLog };
        } catch (e) {
            console.error("--- Chain Execution Error ---", e);
            return { status: 'error', error: e.message };
        }
    }
}

class OptimizedAIAgent {
    constructor() {
        this.max_cycles = 2;
        this.chat_history = [];
        this.provider = new AIAgentProvider(window.llmClient);
        
        this.generation_schema = {
            "type": "object",
            "properties": {
                "test_cases": { "type": "array", "items": { "type": "string" } },
                "logic_structure": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": { "type": "string" },
                            "params": { "type": "object" }
                        }
                    }
                }
            },
            "required": ["test_cases", "logic_structure"]
        };

        this.verification_schema = {
            "type": "object",
            "properties": {
                "status": { "type": "string", "enum": ["ok", "error"] },
                "message": { "type": "string" },
                "summary": { "type": "string" }
            },
            "required": ["status", "message", "summary"]
        };
    }

    async run(user_task, current_chain) {
        this.chat_history = [];
        
        this.chat_history.push({
            "role": "system", 
            "content": this.get_system_instruction()
        });
        
        this.chat_history.push({
            "role": "user", 
            "content": this.create_start_prompt(user_task, current_chain)
        });

        let last_error_description = null;
        let final_result = null;

        for (let cycle = 0; cycle < this.max_cycles; cycle++) {
            console.log(`--- Cycle ${cycle + 1} ---`);

            // STEP 1: Generation
            if (cycle > 0) {
                const fix_prompt = this.create_fix_prompt(last_error_description);
                this.chat_history.push({"role": "user", "content": fix_prompt});
            }
            
            let generation_result;
            try {
                generation_result = await this.provider.llmClient.callLLMWithSchema(
                    this.chat_history, 
                    this.generation_schema
                );
                
                this.chat_history.push({
                    "role": "assistant", 
                    "content": JSON.stringify(generation_result)
                });
            } catch (e) {
                last_error_description = `LLM generation failed: ${e.message}`;
                if (cycle === this.max_cycles - 1) {
                    final_result = { status: "failed", reason: "Error generating structure", last_error: last_error_description };
                }
                continue;
            }

            // STEP 2: Execution
            const test_cases = generation_result.test_cases || [];
            const logic_structure = generation_result.logic_structure || generation_result.blocks || [];
            
            const execution_output = await this.provider.executeLocalLogic(
                logic_structure,
                test_cases
            );

            // STEP 3: Verification
            const verification_prompt = this.create_verification_prompt(
                user_task,
                test_cases,
                execution_output
            );
            
            let verification_result;
            try {
                verification_result = await this.provider.llmClient.callLLMWithSchema(
                    [
                        { "role": "system", "content": "You are a verification agent. You MUST output ONLY valid JSON." },
                        { "role": "user", "content": verification_prompt }
                    ],
                    this.verification_schema
                );
            } catch (e) {
                last_error_description = `Verification failed: ${e.message}`;
                if (cycle === this.max_cycles - 1) {
                    final_result = { status: "failed", reason: "Error in verification", last_error: last_error_description };
                }
                continue;
            }

            // ANALYSIS
            if (verification_result.status === "ok") {
                final_result = {
                    status: "success",
                    structure: logic_structure,
                    execution_output: execution_output,
                    verification_summary: verification_result.summary
                };
                break;
            } else {
                last_error_description = verification_result.message || "Unknown error during verification";
                console.log(`Verification error: ${last_error_description}`);
                
                if (cycle === this.max_cycles - 1) {
                    final_result = {
                        status: "failed",
                        reason: "Max cycles reached without success",
                        last_error: last_error_description
                    };
                }
            }
        }

        return this.generate_user_summary(final_result);
    }

    get_system_instruction() {
        const toolsList = typeof window !== 'undefined' && window.TOOLS ? window.TOOLS : (typeof TOOLS !== 'undefined' ? TOOLS : []);
        const toolsDesc = toolsList.map(t => {
            const params = t.params ? t.params.map(p => `${p.id} (${p.type}): ${p.label || ''}`).join(', ') : 'None';
            return `- ${t.id}: ${t.description || t.title}\n  Params: ${params}`;
        }).join('\n');

        return `You are an AI assistant for StringLOM, a visual data processing pipeline tool.
Your task is to create or modify a chain of processing blocks based on the user's request.
A chain is a JSON array of block objects.
Available blocks and their parameters:
${toolsDesc}

IMPORTANT RULES:
1. ALWAYS respond with valid JSON ONLY. No markdown wrappers, no explanations outside the JSON.
2. The output MUST follow this schema:
{
  "test_cases": ["string", "string"], // An array of test strings to verify the logic
  "logic_structure": [                // The chain of blocks
    {
      "id": "unique-id",
      "type": "block_type",
      "data": { "param_name": "param_value" }
    }
  ]
}
3. The chain must typically start with a "source" block to receive input data, unless it's a completely empty chain. Keep {"type": "source", "params": {}} as the first element.`;
    }

    create_start_prompt(user_task, current_chain) {
        let prompt = `User Task: ${user_task}\n\n`;
        if (current_chain && current_chain.length > 0) {
            prompt += `Current Chain:\n${JSON.stringify(current_chain, null, 2)}\n\nPlease modify the current chain to achieve the User Task. Return the full modified chain in the JSON output.`;
        } else {
            prompt += `Please generate a new chain of blocks to achieve the User Task.`;
        }
        
        prompt += `\n\nRemember, your output MUST be a JSON object containing "test_cases" and "logic_structure" properties. For example:
{
  "test_cases": ["test line 1", "test line 2"],
  "logic_structure": [
    { "type": "source", "params": {} },
    { "type": "regex", "params": { "pattern": "\\\\d+", "replacement": "", "caseInsensitive": false } },
    { "type": "sort", "params": { "order": "asc" } }
  ]
}`;
        return prompt;
    }

    create_verification_prompt(user_task, test_cases, execution_output) {
        return `You need to verify if the generated chain successfully solves the user's task.

User Task: ${user_task}

Test Cases used:
${JSON.stringify(test_cases, null, 2)}

Execution Output:
${JSON.stringify(execution_output, null, 2)}

Evaluate if the output matches the expected result for the user's task.
Respond with a JSON object:
{
  "status": "ok" | "error",
  "message": "Detailed description of the error if status is error, otherwise empty.",
  "summary": "Short summary of what was achieved or what failed."
}
IMPORTANT: Your 'message' and 'summary' fields MUST be in the same language as the original User Task.
ONLY return the JSON object.`;
    }

    create_fix_prompt(error_description) {
        return `The previous generation failed verification with the following error:
${error_description}

Please fix the logic_structure and return the corrected JSON object containing "test_cases" and "logic_structure".`;
    }

    generate_user_summary(final_result) {
        if (!final_result) {
            return {
                status: "failed",
                message: "Unknown error occurred during AI generation."
            };
        }

        if (final_result.status === "success") {
            let detailMessage = final_result.verification_summary || "Chain successfully generated.";
            if (final_result.execution_output && final_result.execution_output.final_output) {
                detailMessage += "\n\nTest Output:\n" + JSON.stringify(final_result.execution_output.final_output, null, 2);
            }
            return {
                status: "success",
                message: detailMessage,
                chain: final_result.structure
            };
        } else {
            return {
                status: "failed",
                message: `Task failed: ${final_result.reason}. Last error: ${final_result.last_error}`
            };
        }
    }
}
