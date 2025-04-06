import { Box, Heading, Text, HStack, IconButton, Link as ChakraLink } from '@chakra-ui/react';
import { Link } from '../types/Link';

interface LinkCardProps {
  link: Link;
  onEdit: (link: Link) => void;
  onDelete: (id: string) => void;
}

export const LinkCard = ({ link, onEdit, onDelete }: LinkCardProps) => {
  return (
    <Box 
      p={4} 
      borderWidth="1px" 
      borderRadius="lg" 
      borderColor="gray.200"
      bg="white"
      shadow="md"
      _hover={{ shadow: 'lg' }}
      transition="all 0.2s"
    >
      <Heading as="h3" size="md" mb={2}>
        <ChakraLink href={link.url} isExternal color="blue.500">
          {link.name}
        </ChakraLink>
      </Heading>
      <Text noOfLines={2} mb={4} color="gray.600">{link.description}</Text>
      <HStack justify="flex-end" spacing={2}>
        <IconButton
          aria-label="Edit link"
          icon={<span>✏️</span>}
          size="sm"
          colorScheme="blue"
          variant="ghost"
          onClick={() => onEdit(link)}
        />
        <IconButton
          aria-label="Delete link"
          icon={<span>🗑️</span>}
          size="sm"
          colorScheme="red"
          variant="ghost"
          onClick={() => onDelete(link.id)}
        />
      </HStack>
    </Box>
  );
}; 