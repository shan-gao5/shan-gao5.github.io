import os
import glob

BLOG_DIRECTORY = './posts'
BLOG_INDEX = './blog.html'

def delete_post():
    posts = glob.glob(f'{BLOG_DIRECTORY}/*.html')
    for i, post in enumerate(posts):
        print(f'{i+1}. {os.path.basename(post)}')

    post_num = int(input('Enter the number of the post you want to delete: '))
    os.remove(posts[post_num - 1])

    with open(BLOG_INDEX, 'r') as file:
        lines = file.readlines()

    with open(BLOG_INDEX, 'w') as file:
        for line in lines:
            if os.path.basename(posts[post_num - 1]) not in line:
                file.write(line)

def add_new_post():
    posts = glob.glob(f'{BLOG_DIRECTORY}/*.html')
    for post in posts:
        with open(BLOG_INDEX, 'r') as file:
            if post in file.read():
                continue
            else:
                print(f'New post found: {post}. Do you want to add it to the blog? (yes/no)')
                choice = input()
                if choice.lower() == 'yes':
                    with open(BLOG_INDEX, 'a') as blog_index:
                        blog_index.write(f"<a href='{post}'>{os.path.basename(post)}</a><br>\n")

def main():
    print("Select an option:")
    print("1) Delete a post")
    print("2) Add new post")

    choice = int(input())

    if choice == 1:
        delete_post()
    elif choice == 2:
        add_new_post()
    else:
        print("Invalid choice")

if __name__ == "__main__":
    main()

