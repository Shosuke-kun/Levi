/**
 * Discord.js modules
 */
import { SlashCommandBuilder } from "discord.js";
import { instructionEmbed } from "./helper/instructionEmbed";
import { interactionReply } from "./helper/interactionReply";
/**
 * Open ai modules
 */
import { Configuration, OpenAIApi } from "openai";

/**
 * Model
 */
import User from "../../models/user.model";

/**
 * Utils
 */
import { decrypt } from "../../utils/crypt";

const SECRET_KEY = process.env.SECRET_KEY || "";

const chatGPT = async (query: string, apiKey: string) => {
	try {
		const configuration = new Configuration({
			apiKey,
		});

		const openai = new OpenAIApi(configuration);

		const chatCompletion = await openai.createChatCompletion({
			model: "gpt-3.5-turbo-0613",
			max_tokens: 256,
			messages: [
				{ role: "system", content: "You are a helpful assistant." },
				{ role: "user", content: query },
			],
		});
		const response = chatCompletion.data.choices[0].message?.content;
		return response;
	} catch (e) {
		console.log("Error fetching gpt reply");
		console.error(e);
		return null;
	}
};

const data = new SlashCommandBuilder()
	.setName("gpt")
	.setDescription("ask chat gpt")
	.addStringOption((option) =>
		option.setName("query").setDescription("enter your query").setRequired(true)
	);

const execute = async (interaction: any) => {
	try {
		const query = interaction.options.getString("query");

		const existingUser = await User.findOne({
			id: interaction.user.id,
		});

		if (existingUser && existingUser.commandCount !== 0) {
			const apiKey = process.env.OPENAI_API_KEY || "";
			const reply = await chatGPT(query, apiKey);

			interactionReply(reply, interaction);

			existingUser.commandCount -= 1;
			await existingUser.save();
		} else if (existingUser?.apiToken) {
			const encryptedKey = existingUser.apiToken;
			const apiKey = decrypt(encryptedKey, SECRET_KEY);

			const reply = await chatGPT(query, apiKey.toString());

			interactionReply(reply, interaction);
		} else if (existingUser === null) {
			const user = new User({
				id: interaction.user.id,
				commandCount: 4,
			});
			await user.save();

			const apiKey = process.env.OPENAI_API_KEY || "";

			const reply = await chatGPT(query, apiKey);

			interactionReply(reply, interaction);
		} else {
			return await interaction.reply({
				embeds: [instructionEmbed],
				ephemeral: true,
			});
		}
	} catch (e) {
		console.log("Error in chateGPT.ts");
		console.error(e);
	}
};

export = {
	data,
	execute,
};
