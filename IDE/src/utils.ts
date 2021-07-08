// descriptor of a filesystem entry. directories have size undefined, files have children undefined
export class File_Descriptor {
	constructor(name: string, size: number|undefined = undefined, children: File_Descriptor[]|undefined = undefined){
		this.name = name;
		this.size = size;
		this.children = children;
	}
	readonly name: string;
	size: number | undefined = undefined;
	children: File_Descriptor[] | undefined = undefined;
}

export interface Bela_Core_Version_Data {
	date: string;
	fileName: string;
	method: string;
	success: number;
	git_desc: string;
	log: string;
}

export interface Init_Message{
	projects	: string[];
  examples	: File_Descriptor[];
  libraries	: File_Descriptor[];
	settings	: any;
	boot_project	: string;
	board_string	: string;
	bela_image_version : string;
	bela_core_version : Bela_Core_Version_Data;
	xenomai_version	: string;
}

export interface Process_Status{
	checkingSyntax	: boolean;
	building	: boolean;
	buildProject	: string;
	running		: boolean;
	runProject	: string;
	syntaxError?	: string;
	buildLog?	: string;
	belaLog?	: string;
	belaLogErr?	: string;
}

export interface Backup_File_Stats{
	exists?:		boolean;
	filename?:		string;
	backup_filename?:	string;
	project?:		string;
}
