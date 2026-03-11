class CustomBlockAIAgent extends OptimizedAIAgent {
    constructor() {
        super();
        this.block_max_cycles = 1;
        
        // Define the extended schema to include optional new_block and its tests
        this.generation_schema = {
            "type": "object",
            "properties": {
                "new_block": {
                    "type": "object",
                    "properties": {
                        "id": { "type": "string" },
                        "title": { "type": "string" },
                        "icon": { "type": "string" },
                        "description": { "type": "string" },
                        "long_description": { "type": "string" },
                        "params": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": { "type": "string" },
                                    "type": { "type": "string", "enum": ["text", "number", "checkbox", "select", "delimiter"] },
                                    "label": { "type": "string" },
                                    "value": {}
                                }
                            }
                        },
                        "js_code": { "type": "string" },
                        "block_test_cases": { "type": "array", "items": { "type": "string" } },
                        "block_expected_output": { "type": "array", "items": { "type": "string" } }
                    },
                    "required": ["id", "title", "icon", "description", "params", "js_code", "block_test_cases", "block_expected_output"]
                },
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

        this.block_verification_schema = {
            "type": "object",
            "properties": {
                "status": { "type": "string", "enum": ["ok", "error"] },
                "message": { "type": "string" }
            },
            "required": ["status", "message"]
        };
    }

    get_system_instruction() {
        const base_instruction = super.get_system_instruction();
        return base_instruction + `\n\nADDITIONAL CAPABILITY:
If the existing blocks are NOT sufficient to solve the user's task, you CAN create a new custom block.
Only create a new block if strictly necessary or explicitly requested by the user.
The new block must be universal and reusable for future tasks.
If you create a new block, include the "new_block" object in your JSON response. It should have the following properties:
- id: unique string identifier (e.g., 'custom_join')
- title: short display title for the tool
- icon: FontAwesome class (e.g., 'fas fa-link')
- description: short description
- long_description: detailed description (optional)
- params: array of parameter definitions, each having: id, type (text, number, checkbox, select, delimiter), label, and an optional default value
- js_code: A string containing a Javascript function body. It gets 'lines' (array of strings) and 'params' (object) as input. It must return an object like '{ result: [...], stats: {...} }'. Example: 'return { result: lines.map(l => l + params.suffix) };'. Do not use any global 'input' variable.
- block_test_cases: array of strings to test this specific block.
- block_expected_output: array of strings representing the expected result after processing 'block_test_cases'.

Remember, the "new_block" is optional. Only use it when required.`;
    }

    async run(user_task, current_chain, allow_new_blocks, on_step) {
        this.on_step = on_step;
        this.chat_history = [];
        
        this.on_step_update('start', 'Starting AI agent...');

        this.chat_history.push({
            "role": "system", 
            "content": this.get_system_instruction()
        });
        
        this.chat_history.push({
            "role": "user", 
            "content": this.create_start_prompt(user_task, current_chain)
        });

        let final_result = null;

        for (let cycle = 0; cycle < this.max_cycles; cycle++) {
            this.on_step_update('cycle_start', `Starting generation cycle ${cycle + 1}...`, { current: cycle + 1, max: this.max_cycles });

            console.log(`--- Main Cycle ${cycle + 1} ---`);
            let generation_result = null;

            try {
                this.on_step_update('generation_start', 'Generating processing logic...');
                generation_result = await this.provider.llmClient.callLLMWithSchema(
                    this.chat_history, 
                    this.generation_schema
                );
                
                this.chat_history.push({
                    "role": "assistant", 
                    "content": JSON.stringify(generation_result)
                });
            } catch (e) {
                const err = `LLM generation failed: ${e.message}`;
                this.on_step_update('generation_error', 'Error generating structure.');
                if (cycle === this.max_cycles - 1) {
                    final_result = { status: "failed", reason: "Error generating structure", last_error: err };
                    break;
                }
                this.chat_history.push({"role": "user", "content": this.create_fix_prompt(err)});
                continue;
            }

            // Step A: New Block Verification Loop
            if (generation_result.new_block) {
                this.on_step_update('block_verification_start', 'New block detected, starting verification...');
                const block_ok = await this.verifyAndFixNewBlock(generation_result.new_block, cycle);
                if (!block_ok) {
                    // LLM failed to fix the block, we continue the main cycle to try generating from scratch or fallback
                    if (cycle === this.max_cycles - 1) {
                        final_result = { status: "failed", reason: "Could not create a working new block.", last_error: "Block verification failed" };
                        break;
                    }
                    this.chat_history.push({"role": "user", "content": "The custom block failed verification and couldn't be fixed. Please try generating a different block or solving the task using existing blocks."});
                    continue;
                }
                this.on_step_update('block_verification_success', 'New block verified and added to tools.');
            }

            // If we are here, new_block is either null or successfully verified and registered
            // Proceed with main chain execution and verification
            const test_cases = generation_result.test_cases || [];
            const logic_structure = generation_result.logic_structure || generation_result.blocks || [];
            
            this.on_step_update('execution_start', 'Executing generated logic with test cases...');
            const execution_output = await this.provider.executeLocalLogic(
                logic_structure,
                test_cases
            );

            const verification_prompt = this.create_verification_prompt(
                user_task,
                test_cases,
                execution_output
            );
            
            let verification_result;
            try {
                this.on_step_update('verification_start', 'Verifying execution results...');
                verification_result = await this.provider.llmClient.callLLMWithSchema(
                    [
                        { "role": "system", "content": "You are a verification agent. You MUST output ONLY valid JSON." },
                        { "role": "user", "content": verification_prompt }
                    ],
                    this.verification_schema
                );
            } catch (e) {
                const err = `Verification failed: ${e.message}`;
                this.on_step_update('verification_error', 'Error during verification.');
                if (cycle === this.max_cycles - 1) {
                    final_result = { status: "failed", reason: "Error in verification", last_error: err };
                    break;
                }
                this.chat_history.push({"role": "user", "content": this.create_fix_prompt(err)});
                continue;
            }

            if (verification_result.status === "ok") {
                this.on_step_update('verification_success', 'Chain verification successful!');
                final_result = {
                    status: "success",
                    chain: logic_structure,
                    execution_output: execution_output,
                    message: verification_result.summary
                };
                break;
            } else {
                const err = verification_result.message || "Unknown error during verification";
                this.on_step_update('verification_failed', `Verification failed: ${err}`);
                console.log(`Main Verification error: ${err}`);
                
                if (cycle === this.max_cycles - 1) {
                    final_result = {
                        status: "failed",
                        reason: "Max cycles reached without success",
                        last_error: err
                    };
                    break;
                }
                this.chat_history.push({"role": "user", "content": this.create_fix_prompt(err)});
            }
        }
        this.on_step_update('end', 'Processing complete.');
        return this.generate_user_summary(final_result);
    }

    async verifyAndFixNewBlock(new_block, main_cycle) {
        console.log("--- New Block Verification Step A ---");
        let current_block = JSON.parse(JSON.stringify(new_block));
        
        // We will keep a separate chat history for fixing the block
        let block_chat_history = [
            { "role": "system", "content": "You are a specialized agent for fixing custom JavaScript blocks. Output ONLY valid JSON." }
        ];

        for (let cycle = 0; cycle < this.block_max_cycles; cycle++) {
            // Evaluate JS Code
            let processFn;
            let executionError = null;
            let actualOutput = null;

            try {
                // Remove wrapping quotes/backticks if present
                let codeStr = current_block.js_code.trim();
                // Ensure it's a valid JS expression representing a function
                // Sometimes LLM returns full function string, sometimes an arrow function
                // A simple includes('=>') is not enough, as it can be part of an inner function.
                const isArrowFunction = /^\s*(async\s+)?(\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/.test(codeStr);
                if (!codeStr.startsWith('function') && !isArrowFunction) {
                    codeStr = `function(lines, params) { ${codeStr} }`;
                }
                
                // Wrap in parentheses to parse as expression
                processFn = eval(`(${codeStr})`);
                
                // Construct default params
                const defaultParams = {};
                if (current_block.params && Array.isArray(current_block.params)) {
                    current_block.params.forEach(p => {
                        defaultParams[p.id] = p.value !== undefined ? p.value : "";
                    });
                }
                
                const resultObj = await processFn(current_block.block_test_cases || [], defaultParams);
                if (!resultObj || !resultObj.result) {
                    throw new Error("process function must return an object with a 'result' array property");
                }
                actualOutput = resultObj.result;
                console.log("--- Custom Block Eval Result ---", actualOutput);

            } catch (e) {
                executionError = e.message;
            }

            // Verify using LLM
            let verificationPrompt = `Block Title: ${current_block.title}
Block Description: ${current_block.description}
Params: ${JSON.stringify(current_block.params, null, 2)}
Test Cases: ${JSON.stringify(current_block.block_test_cases, null, 2)}
Expected Output: ${JSON.stringify(current_block.block_expected_output, null, 2)}
`;

            if (executionError) {
                verificationPrompt += `\nExecution resulted in JavaScript ERROR:\n${executionError}\n\nPlease analyze and fix the js_code.`;
            } else {
                verificationPrompt += `\nActual Execution Output:\n${JSON.stringify(actualOutput, null, 2)}
                
Please compare Actual Output with Expected Output. If they match and solve the block's description, status is 'ok'. Otherwise 'error' with message.`;
            }

            block_chat_history.push({"role": "user", "content": verificationPrompt});

            let verify_res;
            try {
                verify_res = await this.provider.llmClient.callLLMWithSchema(
                    block_chat_history,
                    this.block_verification_schema
                );
                block_chat_history.push({"role": "assistant", "content": JSON.stringify(verify_res)});
            } catch (e) {
                console.error("Block verification LLM error", e);
                return false;
            }

            if (verify_res.status === "ok" && !executionError) {
                // Block is good! Register it.
                this.registerCustomBlock(current_block, processFn);
                return true;
            } else {
                // Request a fix
                let fixPrompt = `The block verification failed: ${verify_res.message || executionError}.
Please provide an updated "new_block" object containing a fixed "js_code" or other properties to resolve the issue.
All user-facing text properties in the block (like 'title', 'description', parameter 'label's) should be in the same language as the title of the block being fixed.
Respond ONLY with the JSON object for the updated "new_block".`;
                
                block_chat_history.push({"role": "user", "content": fixPrompt});

                try {
                    const fix_schema = {
                        "type": "object",
                        "properties": this.generation_schema.properties.new_block.properties,
                        "required": ["id", "title", "description", "params", "js_code"]
                    };
                    const fixed_block = await this.provider.llmClient.callLLMWithSchema(
                        block_chat_history,
                        fix_schema
                    );
                    block_chat_history.push({"role": "assistant", "content": JSON.stringify(fixed_block)});
                    current_block = Object.assign({}, current_block, fixed_block);
                } catch(e) {
                    console.error("Failed to get fixed block", e);
                    return false;
                }
            }
        }
        
        return false; // Failed to fix after max cycles
    }

    registerCustomBlock(blockDef, processFn) {
        // Build the final tool definition
        const toolDef = {
            id: blockDef.id,
            title: blockDef.title,
            icon: blockDef.icon || 'fas fa-puzzle-piece',
            description: blockDef.description,
            long_description: blockDef.long_description,
            category: 'AI/пользователь',
            params: blockDef.params,
            process: processFn,
            custom: true // Flag as user/AI created
        };

        // Ensure we're working with the global TOOLS array (defined in tools.js)
        // Both TOOLS and TOOL_CATEGORIES are global const arrays that can be modified
        const toolsArray = typeof TOOLS !== 'undefined' ? TOOLS : [];
        const existingIndex = toolsArray.findIndex(t => t.id === toolDef.id);
        
        if (existingIndex >= 0) {
            toolsArray[existingIndex] = toolDef;
        } else {
            toolsArray.push(toolDef);
        }
        console.log(`Custom block registered: ${toolDef.id}. Total tools: ${toolsArray.length}`);

        // Add to TOOL_CATEGORIES (defined in categories.js)
        const categoriesArray = typeof TOOL_CATEGORIES !== 'undefined' ? TOOL_CATEGORIES : [];
        let aiCat = categoriesArray.find(c => c.title === 'AI/пользователь' || c.id === 'ai_custom');
        
        if (!aiCat) {
            aiCat = { id: 'ai_custom', title: 'AI/пользователь', tools: [] };
            categoriesArray.push(aiCat);
        }
        
        if (!aiCat.tools.includes(toolDef.id)) {
            aiCat.tools.push(toolDef.id);
        }
        console.log(`Block added to category. Category tools: ${aiCat.tools.length}`);

        // Force UI update with a small delay to ensure state is consistent
        if (typeof window !== 'undefined' && window.app && typeof window.app.setupModal === 'function') {
            // Refresh the modal immediately
            window.app.setupModal();
            console.log('setupModal called after block registration');
        }
    }
}
