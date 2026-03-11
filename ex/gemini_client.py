import os
import logging
import json
from typing import Dict, Any
from config import Config
from gemini_transport import GeminiTransport
from fields_schema import get_field_names

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


class GeminiClient:
    FIELDS = get_field_names()  # Получаем список полей из централизованной схемы

    def __init__(self, config: Config):
        self.logger = logging.getLogger(__name__)
        self.logger.info("Initializing GeminiClient")
        
        self.config = config
        self.gemini_config = config.get_gemini_config()
        
        # Initialize transport layer
        self.transport = GeminiTransport(
            api_key=self.gemini_config['api_key'],
            model=self.gemini_config['model'],
            config=config
        )
        
        self.logger.info(f"GeminiClient initialized with model: {self.gemini_config['model']}")

    def _setup_proxy_client(self) -> None:
        """Deprecated: Proxy is now handled in GeminiTransport"""
        pass

    def extract_fields(self, user_input: str, context: str = "") -> Dict[str, Any]:
        self.logger.info("extract_fields method called")
        
        fields_list = ", ".join(self.FIELDS)
        # Load prompt template from config (reloadable). Use a fallback identical to previous hardcoded prompt.
        prompt_template = self.config.get(
            'gemini.extract_prompt',
            """You are a Jira ticket creation assistant. Extract information from the user's description.

Available fields: {fields_list}

User's description:
{user_input}

Context from recent requests:
{context}

Note: {cfg_context}

Jira Specific Field Options:
- Jira IP: Must be one of: "По FixVersion", "По ссылке на проект", "По ссылке на коммерческий запрос". Default to "По FixVersion" if unclear.
- Issue Type: Default to "Bug" if not specified.
- Priority: Default to "Medium" if not specified.

Extract as much information as possible from the user's description. Return ONLY a valid JSON object with these fields as keys (use exact field names). If a field is not mentioned or unclear, set its value to null. Do not include any text outside the JSON.

Example format:
    {{"Summary": "...", "Issue Type": "...", "Priority": "...", "Fix Version": "...", "Assignee": "...", "Environment": "...", "Description": "...", "Insite Project": "...", "Sprint": "...", "Jira IP": "...", "Epic Link": "...", "Marketing Product": "..."}}

    Remember: Return ONLY the JSON object, no other text."""
        )

        prompt = prompt_template.format(
            user_input=user_input,
            context=context,
            cfg_context=self.config.get_context(),
            fields_list=fields_list
        )

        try:
            self.logger.debug(f"Prompt:\n{prompt}")
            self.logger.debug("Calling Gemini API for field extraction")
            response_text = self.transport.generate_content(prompt)
            self.logger.debug(f"Response:\n{response_text}")
            response_text = response_text.strip()
            
            # Clean up response if it contains markdown code blocks
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            extracted = json.loads(response_text)
            
            # Ensure all fields are present
            for field in self.FIELDS:
                if field not in extracted:
                    extracted[field] = None
            
            self.logger.info("Fields extracted successfully")
            return extracted
        except json.JSONDecodeError as e:
            self.logger.error(f"JSON parsing error in extract_fields: {e}", exc_info=True)
            return {field: None for field in self.FIELDS}
        except Exception as e:
            self.logger.error(f"Error in extract_fields method: {e}", exc_info=True)
            return {field: None for field in self.FIELDS}

    def generate_summary(self, fields: Dict[str, Any]) -> str:
        self.logger.info("generate_summary method called")
        # Load prompt template from config (reloadable)
        prompt_template = self.config.get(
            'gemini.summary_prompt',
            """Based on the following extracted information, generate a clear and concise Jira ticket summary (title).

Issue Type: {issue_type}
Description: {description}
Environment: {environment}

Generate ONLY the summary text, nothing else. Keep it under 120 characters."""
        )

        prompt = prompt_template.format(
            issue_type=fields.get('Issue Type'),
            description=fields.get('Description'),
            environment=fields.get('Environment')
        )

        try:
            self.logger.debug(f"Prompt:\n{prompt}")
            self.logger.debug("Calling Gemini API for summary generation")
            response_text = self.transport.generate_content(prompt)
            self.logger.debug(f"Response:\n{response_text}")
            self.logger.info("Summary generated successfully")
            return response_text.strip()
        except Exception as e:
            self.logger.error(f"Error in generate_summary method: {e}", exc_info=True)
            return fields.get('Summary') or "New Issue"

    def generate_description(self, fields: Dict[str, Any], user_input: str) -> str:
        self.logger.info("generate_description method called")
        # Load prompt template from config at runtime (reloads if config.yaml changes)
        prompt_template = self.config.get(
            'gemini.description_prompt',
            """Улучши и оптимизируй следующее описание для заявки Jira.

Исходное описание:
{user_input}

Требования:
1. Верни ТОЛЬКО улучшенное описание без любого форматирования (без markdown, HTML, заголовков с #, без болда, без списков)
2. Используй обычный текст на русском языке
3. Исправь опечатки, грамматику и пунктуацию
4. Сделай текст более структурированным и понятным
5. Добавь отсутствующие детали если они очевидны из контекста
6. Убери лишнюю информацию и дублирование
7. Текст должен быть профессиональным и лаконичным

Вернись ТОЛЬКО с улучшенным описанием, никаких дополнительных комментариев, заголовков или объяснений."""
        )

        # Format the template with runtime values
        prompt = prompt_template.format(user_input=user_input, fields=fields)

        try:
            self.logger.debug(f"Prompt:\n{prompt}")
            self.logger.debug("Calling Gemini API for description generation")
            response_text = self.transport.generate_content(prompt)
            self.logger.debug(f"Response:\n{response_text}")
            self.logger.info("Description generated successfully")
            return response_text.strip()
        except Exception as e:
            self.logger.error(f"Error in generate_description method: {e}", exc_info=True)
            return user_input

    def ask_clarification(self, missing_fields: list, user_input: str) -> str:
        self.logger.info(f"ask_clarification method called for fields: {missing_fields}")
        fields_str = ", ".join(missing_fields)

        # Load prompt template from config (reloadable)
        prompt_template = self.config.get(
            'gemini.clarification_prompt',
            """The user is creating a Jira ticket. Based on their description, we still need clarification on:
{missing_fields}

Original description: {user_input}

Ask for clarification on the missing fields in a friendly and concise way. Be specific about what information you need."""
        )

        prompt = prompt_template.format(missing_fields=fields_str, user_input=user_input)

        try:
            self.logger.debug(f"Prompt:\n{prompt}")
            self.logger.debug("Calling Gemini API for clarification")
            response_text = self.transport.generate_content(prompt)
            self.logger.debug(f"Response:\n{response_text}")
            self.logger.info("Clarification generated successfully")
            return response_text.strip()
        except Exception as e:
            self.logger.error(f"Error in ask_clarification method: {e}", exc_info=True)
            fields_str = ", ".join(missing_fields)
            return f"Please provide information for: {fields_str}"
