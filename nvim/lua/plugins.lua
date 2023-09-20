-- This file can be loaded by calling `lua require('plugins')` from your init.vimA

-- Only required if you have packer configured as `opt`
vim.cmd [[packadd packer.nvim]]

return require('packer').startup(function(use)
	-- Packer can manage itself
	use 'wbthomason/packer.nvim'
	use {
		'nvim-telescope/telescope.nvim', tag = '0.1.2',
		-- or                            , branch = '0.1.x',
		requires = { {'nvim-lua/plenary.nvim'} }

	}
	use 'pappasam/papercolor-theme-slim'



	use 'lervag/vimtex'
	use 'Shougo/deoplete.nvim'
	use 'roxma/nvim-yarp'
	use 'roxma/vim-hug-neovim-rpc'
	vim.cmd[[let g:deoplete#enable_at_startup = 1]]


	use 'Shougo/neosnippet.vim'
	use 'Shougo/neosnippet-snippets'
	-- These optional plugins should be loaded directly because of a bug in Packer lazy loading
	use 'nvim-tree/nvim-web-devicons' -- OPTIONAL: for file icons
	use 'lewis6991/gitsigns.nvim' -- OPTIONAL: for git status
	use 'romgrk/barbar.nvim'
	use {
		'nvim-tree/nvim-tree.lua',
		requires = {
			'nvim-tree/nvim-web-devicons', -- optional
		},
	}
	use 'makerj/vim-pdf'
	use "nvim-lua/plenary.nvim"
	use 'xuhdev/vim-latex-live-preview'
	use { "ellisonleao/gruvbox.nvim" }



end)
