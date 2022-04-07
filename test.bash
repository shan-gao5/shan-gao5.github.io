for i in $(find * -type d -iname "*.html.LyXconv"); do
	answer="not found in entry"
	echo "$i"
	file=$(find $i/* -type f -iname "*.html")
	echo "$file"
done
