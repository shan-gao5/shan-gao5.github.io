#!/bin/bash
	
#put this code locally in the Github folder and run it using Gitbash


#search for all the entries 

newhtml=()
entrynames=()


#check to see if there are some new entries
for i in $(find * -type f \( -iname "*.html" ! -iname "index.html" \)); do
	answer="not found in entry"

	for entry in $(cat list); do

		if [[ "$i" == "$entry" ]]; then
			answer="found in entry"
		else
			continue
		fi	
	done
	if [[ $answer == "not found in entry" ]]; then
		read -p "file $i doesn't exist in the list of entries, please supply a new name for the entry :  " x
		newhtml=("${newhtml[@]}" "$i")
		entrynames=("${entrynames[@]}" "$x")
		
		
	else
		echo "$i already exists"
		continue
	fi
done



echo "entry file namse: ${newhtml[@]}"
echo "entry names  ${entrynames[@]}"




for i in "${!newhtml[@]}"; do
	echo "${newhtml[i]}" >> list
	echo "<p><a href=\"${newhtml[i]}\">${entrynames[i]}</a>" >> index.html
done