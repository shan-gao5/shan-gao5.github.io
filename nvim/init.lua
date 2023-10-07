require('plugins')
vim.g.mapleader=" "
vim.cmd[[

set background=dark
colorscheme PaperColorSlim
]] 
if vim.g.neovide then
	vim.o.guifont = "Iosevka Nerd Font:h15" -- text below applies for VimScript
	-- Helper function for transparency formatting
	local alpha = function()
		return string.format("%x", math.floor(255 * vim.g.transparency or 0.8))
	end
	-- g:neovide_transparency should be 0 if you want to unify transparency of content and title bar.
	vim.g.neovide_transparency = 0.0
	vim.g.transparency = 0.95
	vim.g.neovide_background_color = "#0f1117" .. alpha()

end
-- disable netrw at the very start of your init.lua
vim.g.loaded_netrw = 1
vim.g.loaded_netrwPlugin = 1

-- set termguicolors to enable highlight groups
vim.opt.termguicolors = true

-- empty setup using defaults
require("nvim-tree").setup()
vim.cmd[[set mouse=a]]
-- OR setup with some options
require("nvim-tree").setup({
  sort_by = "case_sensitive",
  view = {
    width = 30,
  },
  renderer = {
    group_empty = true,
 },
  filters = {
    dotfiles = true,
  },
})
vim.g.livepreview_previewer = 'evince'

vim.cmd[[let g:neosnippet#snippets_directory='~/.config/nvim/UltiSnips']]